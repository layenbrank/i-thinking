CREATE TABLE IF NOT EXISTS `chatUsage` (
	`id` text PRIMARY KEY NOT NULL,
	`runID` text NOT NULL,
	`sessionID` text,
	`providerID` text NOT NULL,
	`model` text NOT NULL,
	`source` text NOT NULL,
	`outcome` text NOT NULL,
	`inputTokens` integer DEFAULT 0 NOT NULL,
	`outputTokens` integer DEFAULT 0 NOT NULL,
	`totalTokens` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_chatUsage_runID` ON `chatUsage` (`runID`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_chatUsage_sessionID` ON `chatUsage` (`sessionID`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_chatUsage_createdAt` ON `chatUsage` (`createdAt`);
