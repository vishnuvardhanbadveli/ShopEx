CREATE TABLE `catalog_change_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operatorId` int NOT NULL,
	`sku` varchar(64) NOT NULL,
	`action` varchar(32) NOT NULL,
	`beforeSnapshot` text,
	`afterSnapshot` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_change_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `observability_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`outcome` varchar(64) NOT NULL,
	`orderId` varchar(64),
	`durationMs` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `observability_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_timeline_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` varchar(64) NOT NULL,
	`buyerId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`title` varchar(160) NOT NULL,
	`detail` text NOT NULL,
	`tone` enum('blue','violet','amber','green','red') NOT NULL DEFAULT 'blue',
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_timeline_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` varchar(64) NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`orderId` varchar(64),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `payment_orders` ADD `shippingAddressSnapshot` text;--> statement-breakpoint
ALTER TABLE `users` ADD `sessionVersion` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `catalog_change_operator_idx` ON `catalog_change_events` (`operatorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `catalog_change_sku_idx` ON `catalog_change_events` (`sku`,`createdAt`);--> statement-breakpoint
CREATE INDEX `observability_type_idx` ON `observability_events` (`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `observability_order_idx` ON `observability_events` (`orderId`);--> statement-breakpoint
CREATE INDEX `order_timeline_order_idx` ON `order_timeline_events` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `order_timeline_buyer_idx` ON `order_timeline_events` (`buyerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `user_notifications_user_idx` ON `user_notifications` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `user_notifications_order_idx` ON `user_notifications` (`orderId`);