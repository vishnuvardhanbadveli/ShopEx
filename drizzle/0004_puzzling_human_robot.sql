CREATE TABLE `saved_addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(64) NOT NULL,
	`recipientName` varchar(160) NOT NULL,
	`line1` varchar(255) NOT NULL,
	`line2` varchar(255),
	`city` varchar(120) NOT NULL,
	`state` varchar(120) NOT NULL,
	`postalCode` varchar(24) NOT NULL,
	`country` varchar(2) NOT NULL DEFAULT 'IN',
	`phone` varchar(32) NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`userId` int NOT NULL,
	`favoriteCategories` varchar(512) NOT NULL DEFAULT '[]',
	`maxBudget` int,
	`deliveryPreference` enum('standard','fastest','flexible') NOT NULL DEFAULT 'standard',
	`orderUpdates` boolean NOT NULL DEFAULT true,
	`deliveryUpdates` boolean NOT NULL DEFAULT true,
	`productUpdates` boolean NOT NULL DEFAULT true,
	`marketingUpdates` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE INDEX `saved_addresses_user_idx` ON `saved_addresses` (`userId`);
