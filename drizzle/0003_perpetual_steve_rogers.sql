ALTER TABLE `payment_orders` ADD `buyerId` int;--> statement-breakpoint
ALTER TABLE `payment_orders` ADD `upsellSku` varchar(64);--> statement-breakpoint
ALTER TABLE `payment_orders` ADD `productSnapshot` text;--> statement-breakpoint
ALTER TABLE `payment_orders` ADD `upsellSnapshot` text;--> statement-breakpoint
ALTER TABLE `payment_orders` ADD `intentSnapshot` text;