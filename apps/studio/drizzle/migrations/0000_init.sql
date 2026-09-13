CREATE TABLE `aiMessage` (
	`id` text PRIMARY KEY NOT NULL,
	`identity` text NOT NULL,
	`fragment` text NOT NULL,
	`thinking` text,
	`parts` text,
	`sessionID` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`sessionID`) REFERENCES `aiSession`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_aiMessage_sessionID` ON `aiMessage` (`sessionID`);--> statement-breakpoint
CREATE INDEX `idx_aiMessage_createdAt` ON `aiMessage` (`createdAt`);--> statement-breakpoint
CREATE TABLE `aiProvider` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`baseUrl` text,
	`models` text,
	`model` text,
	`enabled` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_aiProvider_kind` ON `aiProvider` (`kind`);--> statement-breakpoint
CREATE TABLE `aiSession` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`workspaceID` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`workspaceID`) REFERENCES `aiWorkspace`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_aiSession_workspaceID` ON `aiSession` (`workspaceID`);--> statement-breakpoint
CREATE INDEX `idx_aiSession_updatedAt` ON `aiSession` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `aiWorkspace` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`icon` text DEFAULT 'folder' NOT NULL,
	`color` text DEFAULT '#166534' NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`archivedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_aiWorkspace_archivedAt` ON `aiWorkspace` (`archivedAt`);--> statement-breakpoint
CREATE TABLE `aiWorkspaceFolder` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceID` text NOT NULL,
	`path` text NOT NULL,
	`isPrimary` integer DEFAULT false NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`workspaceID`) REFERENCES `aiWorkspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_aiWorkspaceFolder_workspaceID` ON `aiWorkspaceFolder` (`workspaceID`);--> statement-breakpoint
CREATE TABLE `asset` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantID` text,
	`kind` text,
	`hash` text,
	`sha` text DEFAULT 'sha256' NOT NULL,
	`size` integer,
	`index` integer DEFAULT 1 NOT NULL,
	`mime` text NOT NULL,
	`extension` text,
	`fileName` text NOT NULL,
	`filePath` text NOT NULL,
	`metadata` text,
	`status` text DEFAULT '001' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`deviceID` text,
	`archivedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_asset_hash` ON `asset` (`hash`);--> statement-breakpoint
CREATE INDEX `idx_asset_path` ON `asset` (`filePath`);--> statement-breakpoint
CREATE TABLE `Auth` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `magneticTile` (
	`id` text PRIMARY KEY NOT NULL,
	`index` integer NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`round` text,
	`mark` text,
	`component` text NOT NULL,
	`description` text,
	`size` integer DEFAULT 3 NOT NULL,
	`shape` text DEFAULT 'rectangle' NOT NULL,
	`direction` text DEFAULT 'horizontal' NOT NULL,
	`background` text,
	`backdrop` text,
	`mirrorID` text NOT NULL,
	`textColor` text,
	`collectionID` text,
	`downloadCount` integer DEFAULT 0 NOT NULL,
	`archivedAt` integer,
	`updatedAt` integer NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_magnetic_tile_mirror` ON `magneticTile` (`mirrorID`);--> statement-breakpoint
CREATE TABLE `mirror` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`index` integer NOT NULL,
	`mark` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '暂无描述' NOT NULL,
	`overlay` text DEFAULT '' NOT NULL,
	`background` text,
	`backdrop` text,
	`archivedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `overlay` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`w` real NOT NULL,
	`h` real NOT NULL,
	`z` integer NOT NULL,
	`src` text,
	`opacity` real,
	`tenantID` text,
	`component` text,
	`size` integer,
	`shape` text,
	`direction` text,
	`round` text,
	`background` text,
	`title` text DEFAULT '' NOT NULL,
	`mark` text,
	`scale` real DEFAULT 1 NOT NULL,
	`archivedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_overlay_archivedAt` ON `overlay` (`archivedAt`);--> statement-breakpoint
CREATE INDEX `idx_overlay_tenantID` ON `overlay` (`tenantID`);--> statement-breakpoint
CREATE TABLE `calendar` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`startAt` integer NOT NULL,
	`endAt` integer NOT NULL,
	`entireDay` integer DEFAULT false NOT NULL,
	`color` text,
	`reminderID` text,
	`archivedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`reminderID`) REFERENCES `reminder`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_calendar_startAt` ON `calendar` (`startAt`);--> statement-breakpoint
CREATE INDEX `idx_calendar_reminderID` ON `calendar` (`reminderID`);--> statement-breakpoint
CREATE TABLE `countdown` (
	`id` text PRIMARY KEY NOT NULL,
	`workStart` text DEFAULT '09:00' NOT NULL,
	`workEnd` text DEFAULT '18:00' NOT NULL,
	`workDays` text DEFAULT '[1,2,3,4,5]' NOT NULL,
	`monthlySalary` real DEFAULT 0 NOT NULL,
	`payDay` integer DEFAULT 15 NOT NULL,
	`archivedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reminder` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`dueAt` integer,
	`endAt` integer,
	`fireTime` text,
	`weekDays` text DEFAULT '[]' NOT NULL,
	`entireDay` integer DEFAULT false NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`snoozeUntil` integer,
	`lastFiredAt` integer,
	`priority` integer DEFAULT 0 NOT NULL,
	`archivedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reminder_dueAt` ON `reminder` (`dueAt`);--> statement-breakpoint
CREATE INDEX `idx_reminder_fireTime` ON `reminder` (`fireTime`);--> statement-breakpoint
CREATE INDEX `idx_reminder_enabled` ON `reminder` (`enabled`);--> statement-breakpoint
CREATE INDEX `idx_reminder_archivedAt` ON `reminder` (`archivedAt`);