DROP INDEX "game_item_clues_game_item_id_clue_number_unique";--> statement-breakpoint
DROP INDEX "game_item_guesses_game_item_id_player_id_unique";--> statement-breakpoint
DROP INDEX "game_item_types_type_unique";--> statement-breakpoint
DROP INDEX "game_items_game_id_item_number_unique";--> statement-breakpoint
DROP INDEX "game_types_type_unique";--> statement-breakpoint
DROP INDEX "games_game_number_unique";--> statement-breakpoint
DROP INDEX "initial_combinations_combination_unique";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "user_username_unique";--> statement-breakpoint
ALTER TABLE `participants` ALTER COLUMN "last_name" TO "last_name" text;--> statement-breakpoint
CREATE UNIQUE INDEX `game_item_clues_game_item_id_clue_number_unique` ON `game_item_clues` (`game_item_id`,`clue_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_item_guesses_game_item_id_player_id_unique` ON `game_item_guesses` (`game_item_id`,`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_item_types_type_unique` ON `game_item_types` (`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_items_game_id_item_number_unique` ON `game_items` (`game_id`,`item_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_types_type_unique` ON `game_types` (`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `games_game_number_unique` ON `games` (`game_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `initial_combinations_combination_unique` ON `initial_combinations` (`combination`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);