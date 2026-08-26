CREATE TABLE `payment_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` varchar(64) NOT NULL,
	`sku` varchar(64) NOT NULL,
	`amount` int NOT NULL,
	`status` enum('created','verification_pending','verified','failed','captured') NOT NULL DEFAULT 'created',
	`paymentId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_orders_orderId_unique` UNIQUE(`orderId`)
);
