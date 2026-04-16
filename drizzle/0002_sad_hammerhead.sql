PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_game_item_guesses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_item_id` integer NOT NULL REFERENCES `game_items`(`id`),
	`game_item_clue_id` integer NOT NULL REFERENCES `game_item_clues`(`id`),
	`player_id` integer NOT NULL REFERENCES `participants`(`id`),
	`guess` text,
	`is_correct` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_game_item_guesses` (`id`, `game_item_id`, `game_item_clue_id`, `player_id`, `guess`, `is_correct`)
SELECT
	`g`.`id`,
	`g`.`game_item_id`,
	(
		SELECT `c`.`id`
		FROM `game_item_clues` AS `c`
		WHERE `c`.`game_item_id` = `g`.`game_item_id`
		ORDER BY `c`.`clue_number` DESC
		LIMIT 1
	) AS `game_item_clue_id`,
	`g`.`player_id`,
	`g`.`guess`,
	`g`.`is_correct`
FROM `game_item_guesses` AS `g`;
--> statement-breakpoint
DROP TABLE `game_item_guesses`;
--> statement-breakpoint
ALTER TABLE `__new_game_item_guesses` RENAME TO `game_item_guesses`;
--> statement-breakpoint
CREATE UNIQUE INDEX `game_item_guesses_game_item_id_player_id_unique` ON `game_item_guesses` (`game_item_id`, `player_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
