import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * 工作区技能扫描：对齐 client `workspaceSkills.rs`。
 * 在根下候选目录里找含 `SKILL.md` 的子文件夹，解析 YAML frontmatter。
 */

const SKILL_FILE = 'SKILL.md'
const DESC_MAX = 80
const ROOT_CHILD_CAP = 40
const NESTED_CHILD_CAP = 30

interface WorkspaceSkill {
  id: string
  name: string
  description: string
  path: string
  relative: string
}

function truncateDesc(value: string): string {
  const trimmed = value.split(/\s+/).filter(Boolean).join(' ')
  if ([...trimmed].length <= DESC_MAX) return trimmed
  return `${[...trimmed].slice(0, DESC_MAX).join('')}…`
}

function parseFrontmatter(content: string): { name?: string; description?: string } {
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('---')) return {}

  const rest = trimmed.slice(3)
  const end = rest.indexOf('\n---')
  if (end < 0) return {}

  const block = rest.slice(0, end)
  let name: string | undefined
  let description: string | undefined
  let currentKey: string | undefined
  let currentValue = ''

  function flush() {
    if (!currentKey) return
    const cleaned = currentValue
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .trim()
    if (!cleaned) return
    if (currentKey === 'name') name = cleaned
    if (currentKey === 'description') description = cleaned
  }

  for (const line of block.split(/\r?\n/)) {
    const stripped = line.trimEnd()
    if (!stripped) continue
    const colon = stripped.indexOf(':')
    if (colon > 0) {
      const key = stripped.slice(0, colon).trim()
      if (key === 'name' || key === 'description') {
        flush()
        currentKey = key
        const value = stripped.slice(colon + 1).trim()
        if (value === '>' || value === '|-' || value === '|' || value === '>-') {
          currentValue = ''
        } else {
          currentValue = value
        }
        continue
      }
    }
    if (currentKey) {
      if (currentValue) currentValue += ' '
      currentValue += stripped.trim()
    }
  }
  flush()

  return { name, description }
}

function toPosixRelative(root: string, absolute: string): string {
  const relative = path.relative(root, absolute)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return absolute.replace(/\\/g, '/')
  }
  return relative.replace(/\\/g, '/')
}

function collectFromSkillsDir(
  root: string,
  skillsDir: string,
  out: WorkspaceSkill[],
  seen: Set<string>
) {
  let entries
  try {
    entries = readdirSync(skillsDir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const folder = path.join(skillsDir, entry.name)
    const skillPath = path.join(folder, SKILL_FILE)
    if (!existsSync(skillPath) || !statSync(skillPath).isFile()) continue

    const absolute = skillPath
    if (seen.has(absolute)) continue
    seen.add(absolute)

    let content = ''
    try {
      content = readFileSync(skillPath, 'utf8')
    } catch {
      content = ''
    }
    const parsed = parseFrontmatter(content)
    out.push({
      id: absolute,
      name: parsed.name ?? entry.name,
      description: truncateDesc(parsed.description ?? ''),
      path: absolute,
      relative: toPosixRelative(root, absolute)
    })
  }
}

function skillParentCandidates(root: string): string[] {
  const parents = [
    path.join(root, '.agents', 'skills'),
    path.join(root, '.cursor', 'skills'),
    path.join(root, '.qoder', 'skills')
  ]

  let entries
  try {
    entries = readdirSync(root, { withFileTypes: true }).slice(0, ROOT_CHILD_CAP)
  } catch {
    return parents
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const name = entry.name
    if (name.startsWith('.') || name === 'node_modules' || name === 'target') continue

    const child = path.join(root, name)
    parents.push(path.join(child, '.cursor', 'skills'))
    parents.push(path.join(child, 'src-tauri', '.cursor', 'skills'))

    let nested
    try {
      nested = readdirSync(child, { withFileTypes: true }).slice(0, NESTED_CHILD_CAP)
    } catch {
      continue
    }
    for (const nest of nested) {
      if (!nest.isDirectory()) continue
      const nestPath = path.join(child, nest.name)
      parents.push(path.join(nestPath, '.cursor', 'skills'))
      parents.push(path.join(nestPath, 'src-tauri', '.cursor', 'skills'))
    }
  }

  return parents
}

/**
 * 扫描工作区根下的本地技能。
 */
function listSkills(root: string): WorkspaceSkill[] {
  const out: WorkspaceSkill[] = []
  const seen = new Set<string>()
  for (const parent of skillParentCandidates(root)) {
    if (existsSync(parent) && statSync(parent).isDirectory()) {
      collectFromSkillsDir(root, parent, out, seen)
    }
  }
  out.sort(function (a, b) {
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  return out
}

export { listSkills, parseFrontmatter }
export type { WorkspaceSkill }
