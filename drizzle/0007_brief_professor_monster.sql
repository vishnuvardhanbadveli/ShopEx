CREATE TABLE `active_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenId` varchar(128) NOT NULL,
	`deviceLabel` varchar(160) NOT NULL DEFAULT 'ShopEx browser session',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `active_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `active_sessions_tokenId_unique` UNIQUE(`tokenId`)
);
--> statement-breakpoint
CREATE INDEX `active_sessions_user_idx` ON `active_sessions` (`userId`,`lastSeenAt`);