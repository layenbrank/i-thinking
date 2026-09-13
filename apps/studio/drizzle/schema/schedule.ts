import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** reminder / calendar / countdown */
export const reminder = sqliteTable(
  'reminder',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    notes: text('notes').notNull().default(''),
    dueAt: integer('dueAt'),
    endAt: integer('endAt'),
    fireTime: text('fireTime'),
    /** 星期集合 JSON 字符串，如 "[1,2,3,4,5]" */
    weekDays: text('weekDays').notNull().default('[]'),
    entireDay: integer('entireDay', { mode: 'boolean' }).notNull().default(false),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    snoozeUntil: integer('snoozeUntil'),
    lastFiredAt: integer('lastFiredAt'),
    priority: integer('priority').notNull().default(0),
    archivedAt: integer('archivedAt'),
    createdAt: integer('createdAt').notNull(),
    updatedAt: integer('updatedAt').notNull()
  },
  function (table) {
    return [
      index('idx_reminder_dueAt').on(table.dueAt),
      index('idx_reminder_fireTime').on(table.fireTime),
      index('idx_reminder_enabled').on(table.enabled),
      index('idx_reminder_archivedAt').on(table.archivedAt)
    ]
  }
)

export const calendar = sqliteTable(
  'calendar',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    notes: text('notes').notNull().default(''),
    startAt: integer('startAt').notNull(),
    endAt: integer('endAt').notNull(),
    entireDay: integer('entireDay', { mode: 'boolean' }).notNull().default(false),
    color: text('color'),
    reminderID: text('reminderID').references(() => reminder.id, {
      onDelete: 'set null',
      onUpdate: 'cascade'
    }),
    archivedAt: integer('archivedAt'),
    createdAt: integer('createdAt').notNull(),
    updatedAt: integer('updatedAt').notNull()
  },
  function (table) {
    return [
      index('idx_calendar_startAt').on(table.startAt),
      index('idx_calendar_reminderID').on(table.reminderID)
    ]
  }
)

export const countdown = sqliteTable('countdown', {
  id: text('id').primaryKey(),
  workStart: text('workStart').notNull().default('09:00'),
  workEnd: text('workEnd').notNull().default('18:00'),
  workDays: text('workDays').notNull().default('[1,2,3,4,5]'),
  monthlySalary: real('monthlySalary').notNull().default(0),
  payDay: integer('payDay').notNull().default(15),
  archivedAt: integer('archivedAt'),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull()
})
