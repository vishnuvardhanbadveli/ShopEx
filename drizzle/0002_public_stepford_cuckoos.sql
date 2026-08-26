CREATE TABLE `catalog_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(64) NOT NULL,
	`name` varchar(180) NOT NULL,
	`category` enum('keyboard','mouse','accessory') NOT NULL,
	`price` int NOT NULL,
	`stock` int NOT NULL,
	`deliveryDays` int NOT NULL,
	`deliveryLabel` varchar(64) NOT NULL,
	`attributes` text NOT NULL,
	`description` text NOT NULL,
	`accent` enum('violet','indigo','green','amber') NOT NULL,
	`imageUrl` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_products_sku_unique` UNIQUE(`sku`)
);
