/**
 * AgentSender：contentEditable 输入区，通用触发 + IME，对齐 ant-design/x 结构
 * chip / mention 采用纯 DOM（参考 Cursor 输入框），避免 createRoot 竞态
 */
import { Icon } from '@iconify/react/offline'
import { convertFileSrc } from '@tauri-apps/api/core'
import { Image } from 'antd'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ClipboardEvent,
  type ReactNode,
  type Ref
} from 'react'

import styles from '@/features/agent/chat/agent-sender.module.scss'
import { findChipIconSvg } from '@/features/agent/chat/chip-icon-svg'
import { collectClipboardImages } from '@/features/agent/chat/paste-image'
import {
  parseTriggerToken,
  TRIGGER_RULES,
  type SenderChip,
  type TriggerMatch,
  type TriggerRule
} from '@/features/agent/chat/sender-trigger'
import { findFileIcon, findFileIconTone } from '@/features/agent/model/file-icon'
import { findAssetPath } from '@/features/agent/model/workspace-path'
import type { FilePartData } from '@/features/agent/types'
import { CSSVAR } from '@/themes/runtime/build'

interface AgentSenderProps {
  placeholder?: string
  loading?: boolean
  disabled?: boolean
  /** 浮层打开时拦截 Enter 发送，由父级置 true */
  blockSubmit?: boolean
  autoSize?: { minRows?: number; maxRows?: number }
  /** 图像附件：输入框上方缩略图 + 等宽文件名 */
  images?: FilePartData[]
  footer?: ReactNode
  triggers?: TriggerRule[]
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  onRemoveImage?: (path: string) => void
  /** 粘贴图片文件（由父级落盘并加入附件） */
  onPasteImages?: (files: File[]) => void
  onTriggerChange?: (match: TriggerMatch | null) => void
  /** 键盘导航浮层：ArrowUp/Down/Enter 由父级处理时返回 true */
  onTriggerKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => boolean
}

interface AgentSenderHandle {
  focus: () => void
  /** silent：父级已同步空值时跳过 onChange，避免二次渲染 */
  clear: (options?: { silent?: boolean }) => void
  /** 写入纯文本（欢迎语快捷填入等），会清空现有 chip */
  writePlainText: (text: string) => void
  submit: () => void
  insertChip: (chip: Omit<SenderChip, 'id'> & { id?: string }) => void
  /** 按路径移除编辑器内 chip（与附件区删除保持同步） */
  removeChipByPath: (path: string) => void
  findValue: () => string
  /** 已插入 chip 的路径（归一化），用于去重 */
  findChipPaths: () => string[]
  findChips: () => SenderChip[]
}

const CHIP_ATTR = 'data-agent-chip'
const CHIP_VALUE_ATTR = 'data-value'
const CHIP_KIND_ATTR = 'data-kind'
const CHIP_PATH_ATTR = 'data-path'
const CHIP_CLOSE_ATTR = 'data-chip-close'
const LINE_PX = 24

function normalizeChipPath(path: string) {
  return path.replace(/\\/g, '/')
}

function findChipPathKey(chip: Pick<SenderChip, 'meta' | 'value' | 'kind'>) {
  const fromMeta = chip.meta.path || chip.meta.relative || ''
  if (fromMeta) return normalizeChipPath(fromMeta)
  // 无 path 时退化为序列化值（去掉 @ / 前缀）
  const raw = chip.value.replace(/^[@/]/, '')
  return raw ? normalizeChipPath(raw) : ''
}

function findChipPathsFromDom(root: HTMLElement) {
  const paths: string[] = []
  root.querySelectorAll(`[${CHIP_ATTR}="true"]`).forEach(function (node) {
    const el = node as HTMLElement
    const path = el.getAttribute(CHIP_PATH_ATTR) || ''
    if (!path) return
    const normalized = normalizeChipPath(path)
    if (!paths.includes(normalized)) paths.push(normalized)
  })
  return paths
}

function findChipsFromDom(root: HTMLElement) {
  const chips: SenderChip[] = []
  root.querySelectorAll(`[${CHIP_ATTR}="true"]`).forEach(function (node, index) {
    const el = node as HTMLElement
    const path = el.getAttribute(CHIP_PATH_ATTR) || ''
    const kind = el.getAttribute(CHIP_KIND_ATTR) || 'file'
    const value = el.getAttribute(CHIP_VALUE_ATTR) || ''
    const label = el.dataset.label || el.querySelector(`.${styles.chipLabel}`)?.textContent || ''
    const relative = el.dataset.relative || ''
    chips.push({
      id: el.dataset.chipId || `chip-dom-${index}`,
      kind,
      label,
      value,
      meta: {
        path: path ? normalizeChipPath(path) : '',
        relative: relative ? normalizeChipPath(relative) : '',
        name: label
      }
    })
  })
  return chips
}

/** 触发检测用：chip 按占位符计入，避免 @path 序列化导致幽灵触发 */
function findPlainTextBeforeCaret(root: HTMLElement) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return findPlainTextFromDom(root)
  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer)) return findPlainTextFromDom(root)
  const pre = range.cloneRange()
  pre.selectNodeContents(root)
  pre.setEnd(range.startContainer, range.startOffset)
  const frag = pre.cloneContents()
  const holder = document.createElement('div')
  holder.appendChild(frag)
  return findPlainTextFromDom(holder)
}

function findPlainTextFromDom(root: HTMLElement) {
  let result = ''
  root.childNodes.forEach(function (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || ''
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    if (el.getAttribute(CHIP_ATTR) === 'true') {
      result += '\uFFFC' // 对象替换字符，不构成触发前界
      return
    }
    if (el.tagName === 'BR') {
      result += '\n'
      return
    }
    result += findPlainTextFromDom(el)
  })
  return result
}

function findValueFromDom(root: HTMLElement) {
  let result = ''
  root.childNodes.forEach(function (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || ''
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    if (el.getAttribute(CHIP_ATTR) === 'true') {
      result += el.getAttribute(CHIP_VALUE_ATTR) || ''
      return
    }
    if (el.tagName === 'BR') {
      result += '\n'
      return
    }
    result += findValueFromDom(el)
  })
  return result
}

function findTextBeforeCaret(root: HTMLElement) {
  return findPlainTextBeforeCaret(root)
}

function AgentSenderInner(props: AgentSenderProps, ref: Ref<AgentSenderHandle>) {
  const editableRef = useRef<HTMLDivElement>(null)
  const isComposing = useRef(false)
  const lastTriggerKey = useRef<string | null>(null)
  const chipSeq = useRef(0)
  const triggers = props.triggers ?? TRIGGER_RULES
  const minRows = props.autoSize?.minRows ?? 1
  const maxRows = props.autoSize?.maxRows ?? 6
  const onTriggerChangeRef = useRef(props.onTriggerChange)
  const triggersRef = useRef(triggers)
  const onTriggerKeyDownRef = useRef(props.onTriggerKeyDown)

  useEffect(
    function () {
      onTriggerChangeRef.current = props.onTriggerChange
      triggersRef.current = triggers
      onTriggerKeyDownRef.current = props.onTriggerKeyDown
    },
    [props.onTriggerChange, props.onTriggerKeyDown, triggers]
  )

  function syncPlaceholder(root: HTMLElement) {
    const empty = findValueFromDom(root).replace(/\s/g, '').length === 0
    root.dataset.empty = empty && root.innerText.trim() === '' ? 'true' : 'false'
    if (root.childNodes.length === 0) root.dataset.empty = 'true'
  }

  function syncHeight(root: HTMLElement) {
    root.style.height = 'auto'
    const minH = minRows * LINE_PX
    const maxH = maxRows * LINE_PX
    const next = Math.min(maxH, Math.max(minH, root.scrollHeight))
    root.style.height = `${next}px`
  }

  function emitChange() {
    const root = editableRef.current
    if (!root) return
    syncPlaceholder(root)
    syncHeight(root)
    props.onChange?.(findValueFromDom(root))
  }

  function emitTrigger() {
    if (isComposing.current) {
      if (lastTriggerKey.current !== null) {
        lastTriggerKey.current = null
        onTriggerChangeRef.current?.(null)
      }
      return
    }
    const root = editableRef.current
    if (!root) return
    const before = findTextBeforeCaret(root)
    const match = parseTriggerToken(before, triggersRef.current)
    const key = match ? `${match.char}:${match.query}:${match.behaviorId}` : null
    if (key === lastTriggerKey.current) return
    lastTriggerKey.current = key
    onTriggerChangeRef.current?.(match)
  }

  function placeCaretAfter(node: Node) {
    const selection = window.getSelection()
    if (!selection) return
    const range = document.createRange()
    range.setStartAfter(node)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  function deleteTriggerToken(tokenLength: number) {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || tokenLength <= 0) return

    let remaining = tokenLength
    while (remaining > 0) {
      const range = selection.getRangeAt(0)
      let node: Node | null = range.startContainer
      let offset = range.startOffset

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        if (offset === 0) break
        const child = el.childNodes[offset - 1]
        if (!child) break
        if (child.nodeType === Node.TEXT_NODE) {
          node = child
          offset = (child.textContent || '').length
        } else {
          break
        }
      }

      if (!node || node.nodeType !== Node.TEXT_NODE) break
      const text = node.textContent || ''
      const take = Math.min(remaining, offset)
      if (take <= 0) break
      node.textContent = text.slice(0, offset - take) + text.slice(offset)
      remaining -= take
      const nextOffset = offset - take
      const r = document.createRange()
      r.setStart(node, nextOffset)
      r.collapse(true)
      selection.removeAllRanges()
      selection.addRange(r)
      if (!(node.textContent || '').length) {
        node.parentNode?.removeChild(node)
      }
    }
  }

  /** 纯 DOM mention（对齐 Cursor）：contenteditable=false + 彩色图标 + 关闭钮 */
  function buildChipElement(chip: SenderChip) {
    const host = document.createElement('span')
    host.setAttribute(CHIP_ATTR, 'true')
    host.setAttribute(CHIP_VALUE_ATTR, chip.value)
    host.setAttribute(CHIP_KIND_ATTR, chip.kind)
    const pathKey = findChipPathKey(chip)
    if (pathKey) host.setAttribute(CHIP_PATH_ATTR, pathKey)
    if (chip.meta.relative) host.dataset.relative = normalizeChipPath(chip.meta.relative)
    host.dataset.label = chip.label
    host.dataset.chipId = chip.id
    host.setAttribute('contenteditable', 'false')
    host.className = `${styles.chip} ${CSSVAR.KEY}`

    const fileName = chip.meta.name || chip.label
    const iconName =
      chip.kind === 'skill' ? 'mdi:hammer-wrench' : findFileIcon(fileName)
    const tone = findFileIconTone(fileName, chip.kind)

    const iconWrap = document.createElement('span')
    iconWrap.className = styles.chipIcon
    iconWrap.dataset.tone = tone
    iconWrap.setAttribute('aria-hidden', 'true')
    iconWrap.innerHTML = findChipIconSvg(iconName, 12)
    host.appendChild(iconWrap)

    const label = document.createElement('span')
    label.className = styles.chipLabel
    label.textContent = chip.label
    host.appendChild(label)

    const close = document.createElement('button')
    close.type = 'button'
    close.className = styles.chipClose
    close.setAttribute('aria-label', '移除')
    close.setAttribute(CHIP_CLOSE_ATTR, 'true')
    close.textContent = '×'
    host.appendChild(close)

    return host
  }

  function insertChip(chipInput: Omit<SenderChip, 'id'> & { id?: string }) {
    const root = editableRef.current
    if (!root) return
    const before = findTextBeforeCaret(root)
    const match = parseTriggerToken(before, triggersRef.current)
    if (match) deleteTriggerToken(match.tokenLength)

    const pathKey = findChipPathKey(chipInput)
    if (pathKey && findChipPathsFromDom(root).includes(pathKey)) {
      // 已引用同一路径：只清触发段，不重复插 chip
      lastTriggerKey.current = null
      onTriggerChangeRef.current?.(null)
      emitChange()
      root.focus()
      return
    }

    chipSeq.current += 1
    const chip: SenderChip = {
      id: chipInput.id || `chip-${chipSeq.current}`,
      kind: chipInput.kind,
      label: chipInput.label,
      value: chipInput.value,
      meta: chipInput.meta
    }

    const chipEl = buildChipElement(chip)
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && root.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0)
      range.collapse(true)
      range.insertNode(chipEl)
      const space = document.createTextNode(' ')
      chipEl.after(space)
      placeCaretAfter(space)
    } else {
      root.appendChild(chipEl)
      const space = document.createTextNode(' ')
      root.appendChild(space)
      placeCaretAfter(space)
    }

    lastTriggerKey.current = null
    onTriggerChangeRef.current?.(null)
    emitChange()
    root.focus()
  }

  function removeChipByPath(path: string) {
    const root = editableRef.current
    if (!root) return
    const normalized = normalizeChipPath(path)
    root.querySelectorAll(`[${CHIP_ATTR}="true"]`).forEach(function (node) {
      const el = node as HTMLElement
      const chipPath = normalizeChipPath(el.getAttribute(CHIP_PATH_ATTR) || '')
      if (chipPath !== normalized) return
      el.remove()
    })
    emitChange()
  }

  function clear(options?: { silent?: boolean }) {
    const root = editableRef.current
    if (!root) return
    root.innerHTML = ''
    lastTriggerKey.current = null
    onTriggerChangeRef.current?.(null)
    if (options?.silent) {
      syncPlaceholder(root)
      syncHeight(root)
      return
    }
    emitChange()
  }

  function writePlainText(text: string) {
    const root = editableRef.current
    if (!root) return
    root.textContent = text
    lastTriggerKey.current = null
    onTriggerChangeRef.current?.(null)
    const selection = window.getSelection()
    if (selection) {
      const range = document.createRange()
      range.selectNodeContents(root)
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    emitChange()
    root.focus()
  }

  function focusEditor() {
    editableRef.current?.focus()
  }

  function submitFromEditor() {
    if (props.loading || props.blockSubmit || props.disabled) return
    const root = editableRef.current
    if (!root) return
    const value = findValueFromDom(root).trim()
    if (!value) return
    props.onSubmit?.(value)
  }

  useImperativeHandle(ref, function () {
    return {
      focus: focusEditor,
      clear,
      writePlainText,
      submit: submitFromEditor,
      insertChip,
      removeChipByPath,
      findValue: function () {
        const root = editableRef.current
        return root ? findValueFromDom(root) : ''
      },
      findChipPaths: function () {
        const root = editableRef.current
        return root ? findChipPathsFromDom(root) : []
      },
      findChips: function () {
        const root = editableRef.current
        return root ? findChipsFromDom(root) : []
      }
    }
  })

  useEffect(function () {
    function onSelectionChange() {
      const root = editableRef.current
      if (!root) return
      const selection = window.getSelection()
      if (!selection?.anchorNode || !root.contains(selection.anchorNode)) {
        if (lastTriggerKey.current !== null) {
          lastTriggerKey.current = null
          onTriggerChangeRef.current?.(null)
        }
        return
      }
      emitTrigger()
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return function () {
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [])

  function handleInput() {
    emitChange()
    if (!isComposing.current) emitTrigger()
  }

  function handleCompositionStart() {
    isComposing.current = true
    lastTriggerKey.current = null
    onTriggerChangeRef.current?.(null)
  }

  function handleCompositionEnd() {
    isComposing.current = false
    emitChange()
    emitTrigger()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (isComposing.current || event.nativeEvent.isComposing) return

    if (onTriggerKeyDownRef.current?.(event)) {
      event.preventDefault()
      return
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitFromEditor()
      return
    }

    if (event.key === 'Backspace') {
      const selection = window.getSelection()
      if (!selection?.isCollapsed || !selection.rangeCount) return
      const range = selection.getRangeAt(0)
      if (range.startOffset !== 0) return
      let prev: Node | null = null
      const node = range.startContainer
      if (node.nodeType === Node.TEXT_NODE) {
        prev = node.previousSibling
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        prev = el.childNodes[range.startOffset - 1] || null
      }
      if (prev && (prev as HTMLElement).getAttribute?.(CHIP_ATTR) === 'true') {
        event.preventDefault()
        prev.parentNode?.removeChild(prev)
        emitChange()
        emitTrigger()
      }
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const images = collectClipboardImages(event.clipboardData)
    if (images.length > 0 && props.onPasteImages) {
      event.preventDefault()
      props.onPasteImages(images)
      return
    }
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')
    if (text) document.execCommand('insertText', false, text)
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    const closeBtn = target.closest<HTMLElement>(`[${CHIP_CLOSE_ATTR}="true"]`)
    if (closeBtn) {
      event.preventDefault()
      event.stopPropagation()
      const chip = closeBtn.closest<HTMLElement>(`[${CHIP_ATTR}="true"]`)
      chip?.remove()
      emitChange()
      emitTrigger()
      editableRef.current?.focus()
      return
    }
    emitTrigger()
  }

  function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (target.closest(`[${CHIP_CLOSE_ATTR}="true"]`)) return
    if (target.closest(`[${CHIP_ATTR}="true"]`)) {
      event.preventDefault()
    }
  }

  return (
    <div
      className={styles.main}
      data-disabled={props.disabled ? 'true' : undefined}
      data-loading={props.loading ? 'true' : undefined}>
      {props.images && props.images.length > 0 ? (
        <div className={styles.media}>
          <Image.PreviewGroup>
            <div className={styles.imageStrip}>
              {props.images.map(function (image) {
                return (
                  <div
                    key={image.path}
                    className={styles.imageCard}>
                    <div className={styles.imageThumb}>
                      <Image
                        src={convertFileSrc(findAssetPath(image.path))}
                        alt={image.name}
                        width={72}
                        height={72}
                        classNames={{ image: styles.imagePreview }}
                        styles={{ image: { objectFit: 'cover' } }}
                      />
                      <button
                        type="button"
                        className={styles.imageRemove}
                        aria-label={`移除 ${image.name}`}
                        disabled={props.disabled}
                        onClick={function (event) {
                          event.preventDefault()
                          event.stopPropagation()
                          props.onRemoveImage?.(image.path)
                        }}>
                        <Icon
                          icon="mdi:close"
                          width={12}
                          height={12}
                        />
                      </button>
                    </div>
                    <span
                      className={styles.imageName}
                      title={image.name}>
                      {image.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </Image.PreviewGroup>
        </div>
      ) : null}
      <div className={styles.content}>
        <div
          ref={editableRef}
          className={styles.input}
          contentEditable={!props.disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-label={props.placeholder || '消息输入'}
          aria-multiline
          data-placeholder={props.placeholder || ''}
          data-empty="true"
          onInput={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
        />
      </div>
      {props.footer ? <div className={styles.footer}>{props.footer}</div> : null}
    </div>
  )
}

const AgentSender = forwardRef(AgentSenderInner)
AgentSender.displayName = 'AgentSender'

export { AgentSender }
export type { AgentSenderHandle, AgentSenderProps }
