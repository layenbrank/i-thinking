import { z } from 'zod'

import type { ChannelOfDomain } from '@/shared/ipc/channels'
import { CHANNELS } from '@/shared/ipc/channels'
import type { ChannelSpec } from '@/shared/ipc/spec'

const StatusSchema = z.object({
  isReady: z.boolean(),
  version: z.string(),
  actions: z.array(z.string()),
  hasCorex: z.boolean(),
  /** corex 实际在用的数据目录（指令 / 历史都在这），供界面显示与排错 */
  dataDir: z.string(),
  /** 指令库（SQLite）文件：v13 起指令的唯一真相，界面直接把它显示出来 */
  database: z.string(),
  /** true = 用的是 Studio 自带的那份 corex（用户机器上没装） */
  isBundled: z.boolean()
})

/** 动作与指令共用的分类（corex `Bucket`） */
const BUCKETS = ['system', 'network', 'data', 'ui', 'logic', 'plugin'] as const
const BucketSchema = z.enum(BUCKETS)

type Bucket = z.infer<typeof BucketSchema>

const ActionParamSchema = z.object({
  name: z.string(),
  ty: z.string(),
  required: z.boolean(),
  description: z.string().optional(),
  default: z.unknown().optional()
})

/** 动作目录条目（与 corex `actions --json` 逐字同形） */
const ActionEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  bucket: BucketSchema,
  params: z.array(ActionParamSchema),
  tags: z.array(z.string()),
  permissions: z.array(z.string()),
  input_schema: z.unknown()
})

/**
 * 一次运行（指令 / 单动作）的编号：渲染侧发起时生成、主进程原样贴回每一帧。
 * 同一条指令可以同时在跑多次，帧只有带上它才归得到具体那一次。
 */
const RunIdSchema = z.string().min(1)

/** stream 进度帧（与 `run --json-events` 同一套词汇） */
const ProgressSchema = z.object({
  kind: z.enum(['step_start', 'step_progress', 'step_output', 'step_end']),
  runId: RunIdSchema,
  step: z.string(),
  action: z.string(),
  seq: z.number().int().optional(),
  done: z.number().optional(),
  total: z.number().nullable().optional(),
  unit: z.enum(['bytes', 'items']).optional(),
  /** `step_output` 才有：子进程的哪一路 */
  stream: z.enum(['stdout', 'stderr']).optional(),
  /** `step_output` 才有：一段增量原文，可能半行断开 */
  text: z.string().optional(),
  took_ms: z.number().optional(),
  ok: z.boolean().optional()
})

const InvokeSchema = z.object({
  action: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
  runId: RunIdSchema
})

const RunSchema = z.object({
  name: z.string().min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  runId: RunIdSchema
})

const JobKindSchema = z.enum(['cron', 'watch'])

/** 守护触发帧：起止与步骤同频道顺序推送，避免 PROGRESS / JOB_EVENT 竞态丢帧 */
const JobEventSchema = z.discriminatedUnion('phase', [
  z.object({
    phase: z.literal('start'),
    runId: RunIdSchema,
    kind: JobKindSchema,
    name: z.string().min(1)
  }),
  z.object({
    phase: z.literal('progress'),
    runId: RunIdSchema,
    kind: JobKindSchema,
    name: z.string().min(1),
    progress: ProgressSchema.omit({ runId: true })
  }),
  z.object({
    phase: z.literal('end'),
    runId: RunIdSchema,
    kind: JobKindSchema,
    name: z.string().min(1),
    ok: z.boolean(),
    error: z.string().optional()
  })
])

const JobViewSchema = z.object({
  kind: JobKindSchema,
  name: z.string(),
  id: z.string(),
  pid: z.number().int(),
  is_alive: z.boolean(),
  started_at_ms: z.number().optional(),
  directive_path: z.string()
})

const JobsQuerySchema = z.object({
  kind: JobKindSchema.optional()
})

const JobsReplySchema = z.object({
  jobs: z.array(JobViewSchema)
})

const StartJobSchema = z.object({
  kind: JobKindSchema,
  name: z.string().min(1),
  immediate: z.boolean().optional()
})

const StopJobSchema = z.object({
  kind: JobKindSchema,
  name: z.string().min(1),
  force: z.boolean().optional()
})

const DirectiveNameSchema = z.object({ name: z.string().min(1) })

/**
 * 指令名规则（与 corex 同一条）：裸名字，不带路径分隔符、不带 `..`、非空。
 *
 * 放在契约里是因为两边都要用：渲染侧在保存前先拦一道并把错误显示在输入框旁，
 * 宿主侧（`corex edit`）没有任何 UI，只能自己再挡一次。规则只有一份才不会再漂移。
 */
const INVALID_DIRECTIVE_NAME = /[\\/]|\.\./

function isValidDirectiveName(name: string): boolean {
  return name.length > 0 && !INVALID_DIRECTIVE_NAME.test(name)
}

/** 卡片的元信息；corex 解析不了这条指令时为 `null` */
const DirectiveSummarySchema = z.object({
  description: z.string(),
  step_count: z.number().int(),
  input_count: z.number().int(),
  trigger_count: z.number().int(),
  /** 旧 daemon 没有这两项时当 false */
  has_cron: z.boolean().default(false),
  has_watch: z.boolean().default(false)
})

/** 一次运行的结局：corex 账本里的一项 */
const RunOutcomeSchema = z.object({
  started_at_ms: z.number(),
  ended_at_ms: z.number(),
  ok: z.boolean(),
  /** 失败原因；成功时没有 */
  error: z.string().optional(),
  duration_ms: z.number()
})

/** 最近的运行状况：账本里那条最要紧的运行 + 该指令的累计次数 */
const DirectiveRunSchema = RunOutcomeSchema.extend({
  run_count: z.number().int(),
  failed_count: z.number().int()
})

/** 指令库（SQLite）里的一条（corex `directives` 的一项） */
const DirectiveEntrySchema = z.object({
  name: z.string(),
  /** 分组；`null` = 未分组。v13 起分组就是这一列，没有目录层级了 */
  folder: z.string().nullable(),
  /** 这条指令当初从哪个 YAML 导进来；不是导入来的、或来源已无从得知时为 `null` */
  source: z.string().nullable(),
  /** 是否出现在用户指令墙；预配置系统指令为 false */
  visible: z.boolean().default(true),
  /** 最后一次落库的时刻（epoch ms），卡片按它排「刚改过的」 */
  updated_at_ms: z.number(),
  /** 分类；解析不了的指令没有分类 */
  bucket: BucketSchema.nullable(),
  summary: DirectiveSummarySchema.nullable(),
  /** 最近一次运行；从没跑过、或 corex 关掉了运行历史时缺省 */
  last_run: DirectiveRunSchema.optional()
})
const DirectiveInputSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.unknown().optional()
})

/** 条件：真值表达式字符串 或 eq/ne/gt/lt/contains 二元比较 或 and/or/not 组合 */
type Condition =
  | string
  | {
      eq?: [unknown, unknown]
      ne?: [unknown, unknown]
      gt?: [unknown, unknown]
      lt?: [unknown, unknown]
      /** 包含：字符串找子串，数组找元素（corex `contains`） */
      contains?: [unknown, unknown]
      and?: Condition[]
      or?: Condition[]
      not?: Condition
    }

const ConditionSchema: z.ZodType<Condition> = z.lazy(function () {
  return z.union([
    z.string(),
    z
      .object({
        eq: z.tuple([z.unknown(), z.unknown()]).optional(),
        ne: z.tuple([z.unknown(), z.unknown()]).optional(),
        gt: z.tuple([z.unknown(), z.unknown()]).optional(),
        lt: z.tuple([z.unknown(), z.unknown()]).optional(),
        contains: z.tuple([z.unknown(), z.unknown()]).optional(),
        and: z.array(ConditionSchema).optional(),
        or: z.array(ConditionSchema).optional(),
        not: ConditionSchema.optional()
      })
      .catchall(z.unknown())
  ])
})

type OnError = 'abort' | 'continue' | 'skip'

type ActionStep = {
  id: string
  action: string
  params?: Record<string, unknown>
  save_to?: string
  when?: Condition
  on_error?: OnError
  retry?: number
}

type IfStep = {
  id: string
  if: Condition
  then: Step[]
  else?: Step[]
}

type RepeatStep = {
  id: string
  repeat: { count?: number; each?: string; as?: string; index?: string }
  max_concurrency?: number
  steps: Step[]
}

type ParallelStep = {
  id: string
  parallel: Step[]
  max_concurrency?: number
}

/** 顺序块：把多步收成一个步骤，好放进 `parallel` 的分支（corex `StepsStep`） */
type StepsStep = {
  id?: string
  steps: Step[]
}

type Step = ActionStep | IfStep | RepeatStep | ParallelStep | StepsStep

const ActionStepSchema = z
  .object({
    id: z.string(),
    action: z.string(),
    params: z.record(z.string(), z.unknown()).optional(),
    save_to: z.string().optional(),
    when: ConditionSchema.optional(),
    on_error: z.enum(['abort', 'continue', 'skip']).optional(),
    retry: z.number().int().nonnegative().optional()
  })
  .catchall(z.unknown())

const StepSchema: z.ZodType<Step> = z.lazy(function () {
  return z.union([
    ActionStepSchema,
    z
      .object({
        id: z.string(),
        if: ConditionSchema,
        then: z.array(StepSchema),
        else: z.array(StepSchema).optional()
      })
      .catchall(z.unknown()),
    z
      .object({
        id: z.string(),
        repeat: z.object({
          count: z.number().int().nonnegative().optional(),
          each: z.string().optional(),
          as: z.string().optional(),
          index: z.string().optional()
        }),
        max_concurrency: z.number().int().nonnegative().optional(),
        steps: z.array(StepSchema)
      })
      .catchall(z.unknown()),
    z
      .object({
        id: z.string(),
        parallel: z.array(StepSchema),
        max_concurrency: z.number().int().nonnegative().optional()
      })
      .catchall(z.unknown()),
    z
      .object({
        id: z.string().optional(),
        steps: z.array(StepSchema)
      })
      .catchall(z.unknown())
  ])
})

const PermissionsSchema = z.object({
  capture: z.boolean().optional(),
  clipboard: z.boolean().optional(),
  filesystem: z.boolean().optional(),
  network: z.boolean().optional(),
  notifications: z.boolean().optional(),
  secret: z.boolean().optional(),
  shell: z.boolean().optional(),
  ui: z.boolean().optional()
})

const TriggerSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('cron'),
      expr: z.string(),
      timezone: z.string().optional()
    })
    .catchall(z.unknown()),
  z
    .object({
      type: z.literal('watch'),
      paths: z.array(z.string()).min(1),
      includes: z.array(z.string()).optional(),
      excludes: z.array(z.string()).optional(),
      events: z.array(z.enum(['create', 'modify', 'remove', 'access'])).optional(),
      debounce_ms: z.number().int().nonnegative().optional(),
      debounce: z.enum(['leading', 'trailing', 'both']).optional(),
      throttle_ms: z.number().int().positive().optional(),
      throttle: z.enum(['leading', 'trailing', 'both']).optional(),
      poll: z.boolean().optional(),
      immediate: z.boolean().optional()
    })
    .catchall(z.unknown())
])

/**
 * 指令模型。字段与 corex `schemas/directive.schema.json` 对齐；未知字段显式保留，
 * 这样 Studio 可以读取新版本 corex 的定义而不在保存时静默丢字段。
 */
const DirectiveContentSchema = z
  .object({
    name: z.string(),
    description: z.string().default(''),
    version: z
      .string()
      .nullish()
      .transform(function (value) {
        return value ?? ''
      }),
    bucket: BucketSchema.nullable().optional(),
    inputs: z.array(DirectiveInputSchema).default([]),
    variables: z.record(z.string(), z.unknown()).optional(),
    permissions: PermissionsSchema.optional(),
    triggers: z.array(TriggerSchema).optional(),
    on_error: z.enum(['abort', 'continue', 'skip']).optional(),
    steps: z.array(StepSchema).default([])
  })
  .catchall(z.unknown())

/** 一条指令：corex 从模型序列化出的 YAML（只读展示 / 导出）+ 模型本身 */
const DirectiveDocumentSchema = z.object({
  name: z.string(),
  folder: z.string().nullable(),
  source: z.string().nullable(),
  created_at_ms: z.number(),
  updated_at_ms: z.number(),
  /** 规范化的 YAML 原文；只用于显示与对账，改它不会生效 */
  yaml: z.string(),
  definition: DirectiveContentSchema
})

/** 保存：`definition.name` 是新名字，`original_name` 不同即改名（daemon 原子完成，不留旧行） */
const DirectiveSaveSchema = z.object({
  definition: DirectiveContentSchema,
  original_name: z.string().optional()
})

const ImportStatusSchema = z.enum(['created', 'updated', 'skipped', 'failed'])

/** 导入结果里的一条：`path` 是它来自的那个 YAML 文件（排错用） */
const ImportEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  status: ImportStatusSchema,
  error: z.string().optional()
})

const ImportResultSchema = z.object({
  entries: z.array(ImportEntrySchema),
  created: z.number().int(),
  updated: z.number().int(),
  skipped: z.number().int(),
  failed: z.number().int()
})

const ImportSchema = z.object({
  /** 要导入的目录或单个 YAML 文件 */
  path: z.string().min(1),
  /** 导进哪个分组；不写 = 未分组 */
  folder: z.string().optional(),
  /** 同名已存在时是否覆盖；不写交给 corex 的默认 */
  is_overwrite: z.boolean().optional(),
  /** 只报告会做什么，不落库 */
  is_dry_run: z.boolean().optional()
})

type DirectiveContent = z.infer<typeof DirectiveContentSchema>
type DirectiveDocument = z.infer<typeof DirectiveDocumentSchema>
type DirectiveEntry = z.infer<typeof DirectiveEntrySchema>
type ImportEntry = z.infer<typeof ImportEntrySchema>
type ImportResult = z.infer<typeof ImportResultSchema>
type ImportStatus = z.infer<typeof ImportStatusSchema>
type DirectiveStep = Step
type DirectiveCondition = Condition
type DirectiveTrigger = z.infer<typeof TriggerSchema>
type DirectivePermissions = z.infer<typeof PermissionsSchema>
type DirectiveInput = z.infer<typeof DirectiveInputSchema>
type DirectiveRun = z.infer<typeof DirectiveRunSchema>
type DirectiveSummary = z.infer<typeof DirectiveSummarySchema>
type JobKind = z.infer<typeof JobKindSchema>
type JobView = z.infer<typeof JobViewSchema>
type JobEvent = z.infer<typeof JobEventSchema>

export const sidecarSpecs = {
  [CHANNELS.SIDECAR.READ]: { in: z.void(), out: StatusSchema },
  [CHANNELS.SIDECAR.ACTIONS]: { in: z.void(), out: z.array(ActionEntrySchema) },
  [CHANNELS.SIDECAR.DIRECTIVES]: { in: z.void(), out: z.array(DirectiveEntrySchema) },
  [CHANNELS.SIDECAR.DIRECTIVE]: { in: DirectiveNameSchema, out: DirectiveDocumentSchema },
  [CHANNELS.SIDECAR.SAVE]: { in: DirectiveSaveSchema, out: DirectiveDocumentSchema },
  [CHANNELS.SIDECAR.DELETE]: { in: DirectiveNameSchema, out: DirectiveNameSchema },
  [CHANNELS.SIDECAR.IMPORT]: { in: ImportSchema, out: ImportResultSchema },
  [CHANNELS.SIDECAR.EDIT]: { in: DirectiveNameSchema, out: z.void() },
  [CHANNELS.SIDECAR.INVOKE]: { in: InvokeSchema, out: z.unknown() },
  [CHANNELS.SIDECAR.RUN]: { in: RunSchema, out: z.unknown() },
  [CHANNELS.SIDECAR.JOBS]: { in: JobsQuerySchema, out: JobsReplySchema },
  [CHANNELS.SIDECAR.START_JOB]: { in: StartJobSchema, out: JobViewSchema },
  [CHANNELS.SIDECAR.STOP_JOB]: { in: StopJobSchema, out: JobViewSchema }
} as const satisfies Record<
  Exclude<
    ChannelOfDomain<'sidecar'>,
    typeof CHANNELS.SIDECAR.PROGRESS | typeof CHANNELS.SIDECAR.JOB_EVENT
  >,
  ChannelSpec
>

export const sidecarPushSpec = {
  [CHANNELS.SIDECAR.PROGRESS]: { out: ProgressSchema },
  [CHANNELS.SIDECAR.JOB_EVENT]: { out: JobEventSchema }
} as const

export {
  ActionEntrySchema,
  ActionParamSchema,
  ActionStepSchema,
  BUCKETS,
  BucketSchema,
  ConditionSchema,
  DirectiveContentSchema,
  DirectiveDocumentSchema,
  DirectiveEntrySchema,
  DirectiveInputSchema,
  DirectiveNameSchema,
  DirectiveRunSchema,
  DirectiveSaveSchema,
  DirectiveSummarySchema,
  ImportEntrySchema,
  ImportResultSchema,
  ImportSchema,
  ImportStatusSchema,
  isValidDirectiveName,
  PermissionsSchema,
  ProgressSchema,
  JobEventSchema,
  RunOutcomeSchema,
  StatusSchema,
  StepSchema,
  TriggerSchema
}
export type {
  Bucket,
  Condition,
  DirectiveCondition,
  DirectiveContent,
  DirectiveDocument,
  DirectiveEntry,
  DirectiveInput,
  DirectivePermissions,
  DirectiveRun,
  DirectiveStep,
  DirectiveSummary,
  DirectiveTrigger,
  IfStep,
  ImportEntry,
  ImportResult,
  ImportStatus,
  JobEvent,
  JobKind,
  JobView,
  OnError,
  ParallelStep,
  RepeatStep,
  Step,
  StepsStep
}
