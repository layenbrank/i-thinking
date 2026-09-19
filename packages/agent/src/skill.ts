/**
 * 技能 / 附件 / 引用：对齐 opencode v2 `/skills/`、`/attachments/`、`/references/`。
 * 技能是「描述 + 命中时注入的提示词」，附件是文件/图片/URL，引用是 @ 工作区路径名单。
 */

interface Skill {
  name: string
  /** 何时可用：给模型看的触发条件 */
  description: string
  /** 命中时注入系统提示词的正文 */
  prompt: string
}

interface Attachment {
  /** 文件名或标题 */
  name: string
  /** 相对路径 / 上传文件 id / URL，解释权归宿主 */
  uri: string
  mediaType?: string
}

/** @ 引用：工作区相对路径名单（不内联内容，模型用 fs_read 取） */
type Reference = string

export type { Attachment, Reference, Skill }
