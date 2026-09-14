CREATE TABLE `chatMessage` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionID` text NOT NULL,
	`parentID` text,
	`format` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`sessionID`) REFERENCES `chatSession`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parentID`) REFERENCES `chatMessage`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chatMessage_sessionID` ON `chatMessage` (`sessionID`);--> statement-breakpoint
CREATE INDEX `idx_chatMessage_parentID` ON `chatMessage` (`parentID`);--> statement-breakpoint
CREATE INDEX `idx_chatMessage_createdAt` ON `chatMessage` (`createdAt`);--> statement-breakpoint
CREATE TABLE `chatProvider` (
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
CREATE INDEX `idx_chatProvider_kind` ON `chatProvider` (`kind`);--> statement-breakpoint
CREATE TABLE `chatSession` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`providerID` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`providerID`) REFERENCES `chatProvider`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_chatSession_updatedAt` ON `chatSession` (`updatedAt`);--> statement-breakpoint
CREATE INDEX `idx_chatSession_providerID` ON `chatSession` (`providerID`);