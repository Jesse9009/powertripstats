CREATE TABLE `game_players` (
	`game_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	PRIMARY KEY(`game_id`, `player_id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
