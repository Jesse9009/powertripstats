CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `games` ADD `location_id` integer REFERENCES locations(id);
--> statement-breakpoint
INSERT INTO `locations` (`name`) VALUES ('In Studio');
--> statement-breakpoint
UPDATE `games` SET `location_id` = (SELECT `id` FROM `locations` WHERE `name` = 'In Studio');