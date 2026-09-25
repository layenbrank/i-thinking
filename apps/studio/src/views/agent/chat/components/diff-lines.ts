/**
 * unified diff 的解析（纯函数，无框架依赖）。
 *
 * 输入是 opencode `session.diff` 给的那段 `patch`，也就是 git 风格的 unified diff；
 * 输出按「文件 → hunk → 行」三层铺开，每行带旧/新行号，界面只管上色和排版。
 *
 * 两个容易踩的点，都在这里处理掉：
 * - hunk **正文里**的删除行可能是 `--- 某某`（内容以 `--` 开头），不能当成文件头；
 * - `+++ /dev/null`（删文件）与 `--- /dev/null`（建文件）时路径要从另一侧取。
 */

/** 一次最多铺这么多行正文，其余折起来 —— 侧栏很窄，几百行全铺反而看不清改了什么 */
const DIFF_PREVIEW_LIMIT = 200

type DiffLineKind = 'add' | 'remove' | 'context'

interface DiffLine {
  kind: DiffLineKind
  /** 旧文件行号；新增行没有 */
  oldLine: number | null
  /** 新文件行号；删除行没有 */
  newLine: number | null
  text: string
}

interface DiffHunk {
  /** `@@ -1,3 +1,4 @@` 原文（可能带函数名后缀），原样展示给用户 */
  header: string
  lines: DiffLine[]
}

interface DiffFile {
  path: string
  added: number
  removed: number
  hunks: DiffHunk[]
}

interface DiffPreview {
  files: DiffFile[]
  /** 因超过行数预算而没铺出来的正文行数 */
  hidden: number
}

/** 这些行只描述「文件怎么了」，不是内容本身，解析时跳过 */
const META_PREFIXES = [
  'index ',
  'new file mode ',
  'deleted file mode ',
  'old mode ',
  'new mode ',
  'similarity index ',
  'dissimilarity index ',
  'rename from ',
  'rename to ',
  'copy from ',
  'copy to ',
  'Binary files ',
  'GIT binary patch'
]

function isMetaLine(line: string): boolean {
  if (line.startsWith('\\ No newline at end of file')) return true
  return META_PREFIXES.some(function (prefix) {
    return line.startsWith(prefix)
  })
}

/** `--- a/x.ts\t2024-01-01 00:00:00` → `a/x.ts`；git 对非 ASCII 路径会加引号并转义 */
function toPathFromFileHeader(line: string): string | null {
  const raw = line.slice(4).split('\t')[0]
  const value = raw.startsWith('"') ? unquote(raw) : raw
  const withoutPrefix = value.replace(/^[ab]\//, '')
  return withoutPrefix === '/dev/null' || withoutPrefix === '' ? null : withoutPrefix
}

/**
 * `"a/\344\270\255\346\226\207.md"` → `中文.md`。
 *
 * git 的非 ASCII 路径不是 JSON 转义（没有 `\uXXXX`），而是 C 风格的**八进制字节**转义，
 * 所以自己走一遍：八进制还原成字节、其余字符按 UTF-8 编码成字节，最后整体按 UTF-8 解码。
 */
function unquote(value: string): string {
  if (!value.startsWith('"')) return value

  const inner = value.slice(1, value.endsWith('"') ? -1 : undefined)
  const bytes: number[] = []
  const encoder = new TextEncoder()
  // 普通转义字符：`\t` 之类在路径里几乎不会出现，但出现了也不该把反斜杠留在文件名里
  const escapes: Readonly<Record<string, string>> = {
    n: '\n',
    t: '\t',
    r: '\r',
    a: '\x07',
    b: '\b',
    f: '\f',
    v: '\v',
    '\\': '\\',
    '"': '"'
  }

  function push(text: string): void {
    for (const byte of encoder.encode(text)) bytes.push(byte)
  }

  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index]

    if (char !== '\\') {
      push(char)
      continue
    }

    const next = inner[index + 1] ?? ''
    const octal = /^[0-7]{1,3}/.exec(inner.slice(index + 1))

    if (octal) {
      bytes.push(Number.parseInt(octal[0], 8))
      index += octal[0].length
      continue
    }

    push(escapes[next] ?? next)
    index += 1
  }

  return new TextDecoder().decode(Uint8Array.from(bytes))
}

/** `diff --git a/x.ts b/x.ts` → `x.ts`（取 b 侧；两侧同名时无所谓） */
function toPathFromGitHeader(line: string): string {
  const body = line.slice('diff --git '.length).trim()
  const match = /\sb\/(.+)$/.exec(body)
  const raw = match ? match[1] : body
  return raw.startsWith('"') ? unquote(raw) : raw
}

interface HunkStart {
  oldLine: number
  newLine: number
  /** hunk 里旧文件侧应有的行数；两侧都耗尽就说明这个 hunk 结束了 */
  oldCount: number
  newCount: number
}

/** `@@ -12,3 +12,5 @@ fn foo()` → 起点与行数；省略行数时按 1 行算 */
function parseHunkStart(line: string): HunkStart | null {
  const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line)
  if (!match) return null
  return {
    oldLine: Number(match[1]),
    newLine: Number(match[3]),
    oldCount: match[2] === undefined ? 1 : Number(match[2]),
    newCount: match[4] === undefined ? 1 : Number(match[4])
  }
}

/**
 * 解析完整 patch（不做行数裁剪，`added`/`removed` 必须是真实值）。
 *
 * 靠 hunk 头声明的行数判断「hunk 何时结束」，而不是靠 `@@` / `diff --git` 之类的前缀：
 * hunk 正文里完全可能出现一行内容就叫 `diff --git a/x`，按前缀切会把它当成新文件。
 */
function toDiffFiles(patch: string): DiffFile[] {
  const files: DiffFile[] = []
  let file: DiffFile | null = null
  let hunk: DiffHunk | null = null
  let oldLine = 0
  let newLine = 0
  let remainingOld = 0
  let remainingNew = 0
  let inHunk = false

  /** 开一段新文件。返回而不是只赋值：闭包里赋值会让 TS 的收窄分析失效 */
  function createFile(path: string): DiffFile {
    const created: DiffFile = { path, added: 0, removed: 0, hunks: [] }
    files.push(created)
    hunk = null
    inHunk = false
    return created
  }

  for (const line of patch.split('\n')) {
    if (inHunk && remainingOld <= 0 && remainingNew <= 0) inHunk = false

    if (!inHunk) {
      if (line.startsWith('diff --git ')) {
        file = createFile(toPathFromGitHeader(line))
        continue
      }

      if (line.startsWith('--- ')) {
        // 有些产出方不打 `diff --git`，靠 `---`/`+++` 也能定界
        const path = toPathFromFileHeader(line)
        if (!file || file.hunks.length > 0) file = createFile(path ?? '')
        else file.path = path ?? file.path
        continue
      }

      if (line.startsWith('+++ ')) {
        const path = toPathFromFileHeader(line)
        if (!file) file = createFile(path ?? '')
        else if (path !== null) file.path = path
        continue
      }

      if (line.startsWith('@@')) {
        const start = parseHunkStart(line)
        if (!file) file = createFile('')
        hunk = { header: line, lines: [] }
        file.hunks.push(hunk)
        oldLine = start?.oldLine ?? 0
        newLine = start?.newLine ?? 0
        remainingOld = start?.oldCount ?? 0
        remainingNew = start?.newCount ?? 0
        inHunk = true
        continue
      }

      // hunk 之外的散行：`index …` 之类的头部，忽略
      continue
    }

    const currentFile = file
    const currentHunk = hunk
    if (!currentFile || !currentHunk) continue
    if (isMetaLine(line)) continue

    const marker = line.charAt(0)
    const text = line.slice(1)
    remainingOld -= marker === '+' ? 0 : 1
    remainingNew -= marker === '-' ? 0 : 1

    if (marker === '+') {
      currentHunk.lines.push({ kind: 'add', oldLine: null, newLine, text })
      newLine += 1
      currentFile.added += 1
      continue
    }

    if (marker === '-') {
      currentHunk.lines.push({ kind: 'remove', oldLine, newLine: null, text })
      oldLine += 1
      currentFile.removed += 1
      continue
    }

    // 上下文行以空格开头；空行（丢了前缀）也按上下文处理，别把它当成新的文件段
    currentHunk.lines.push({ kind: 'context', oldLine, newLine, text })
    oldLine += 1
    newLine += 1
  }

  return files.filter(function (item) {
    return item.hunks.length > 0
  })
}

/** 按预算裁掉正文行（文件头保留 —— 用户至少要看到「哪个文件变了多少行」） */
function trimFiles(files: DiffFile[], maxLines: number): { files: DiffFile[]; hidden: number } {
  let budget = maxLines
  let hidden = 0

  const trimmed = files.map(function (file) {
    const hunks: DiffHunk[] = []

    for (const item of file.hunks) {
      if (budget <= 0) {
        hidden += item.lines.length
        continue
      }

      const lines = item.lines.slice(0, budget)
      hidden += item.lines.length - lines.length
      budget -= lines.length
      hunks.push({ header: item.header, lines })
    }

    return { path: file.path, added: file.added, removed: file.removed, hunks }
  })

  return { files: trimmed, hidden }
}

/** patch → 可渲染的预览（正文按 `maxLines` 裁剪，`added`/`removed` 仍按完整 patch 统计） */
function toDiffPreview(patch: string, maxLines = DIFF_PREVIEW_LIMIT): DiffPreview {
  if (!patch.trim()) return { files: [], hidden: 0 }
  return trimFiles(toDiffFiles(patch), maxLines)
}

export { DIFF_PREVIEW_LIMIT, toDiffFiles, toDiffPreview }
export type { DiffFile, DiffHunk, DiffLine, DiffLineKind, DiffPreview }
