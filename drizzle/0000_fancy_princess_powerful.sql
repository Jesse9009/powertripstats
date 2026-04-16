DROP TABLE IF EXISTS `users`;
--> statement-breakpoint
CREATE TABLE `participants` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `first_name` text NOT NULL,
  `last_name` text NOT NULL,
  `nickname` text,
  `image_url` text
);
--> statement-breakpoint
CREATE TABLE `initial_combinations` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `combination` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `initial_combinations_combination_unique` ON `initial_combinations` (`combination`);
--> statement-breakpoint
CREATE TABLE `game_types` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `type` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_types_type_unique` ON `game_types` (`type`);
--> statement-breakpoint
CREATE TABLE `game_item_types` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `type` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_item_types_type_unique` ON `game_item_types` (`type`);
--> statement-breakpoint
CREATE TABLE `sponsors` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `games` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `game_number` integer NOT NULL,
  `game_date` integer NOT NULL,
  `host_participant_id` integer NOT NULL REFERENCES `participants`(`id`),
  `initial_combination_id` integer NOT NULL REFERENCES `initial_combinations`(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_game_types` (
  `game_id` integer NOT NULL REFERENCES `games`(`id`),
  `game_type_id` integer NOT NULL REFERENCES `game_types`(`id`),
  PRIMARY KEY (`game_id`, `game_type_id`)
);
--> statement-breakpoint
CREATE TABLE `game_prizes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `game_id` integer NOT NULL REFERENCES `games`(`id`),
  `prize` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_prize_beneficiaries` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `game_prize_id` integer NOT NULL REFERENCES `game_prizes`(`id`),
  `player_id` integer NOT NULL REFERENCES `participants`(`id`),
  `pick_order` integer NOT NULL,
  `beneficiary_name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jackpots` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `game_id` integer NOT NULL REFERENCES `games`(`id`),
  `one_correct` integer NOT NULL,
  `both_correct` integer NOT NULL,
  `caller_name` text,
  `caller_guess_initials_combination_id` integer REFERENCES `initial_combinations`(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_sponsors` (
  `game_id` integer NOT NULL REFERENCES `games`(`id`),
  `sponsor_id` integer NOT NULL REFERENCES `sponsors`(`id`),
  PRIMARY KEY (`game_id`, `sponsor_id`)
);
--> statement-breakpoint
CREATE TABLE `game_player_sponsors` (
  `game_id` integer NOT NULL REFERENCES `games`(`id`),
  `sponsor_id` integer NOT NULL REFERENCES `sponsors`(`id`),
  `player_id` integer NOT NULL REFERENCES `participants`(`id`),
  PRIMARY KEY (`game_id`, `sponsor_id`, `player_id`)
);
--> statement-breakpoint
CREATE TABLE `game_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `game_id` integer NOT NULL REFERENCES `games`(`id`),
  `item_number` integer NOT NULL,
  `game_item_type_id` integer NOT NULL REFERENCES `game_item_types`(`id`),
  `item_answer` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_items_game_id_item_number_unique` ON `game_items` (`game_id`, `item_number`);
--> statement-breakpoint
CREATE TABLE `game_item_clues` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `game_item_id` integer NOT NULL REFERENCES `game_items`(`id`),
  `clue_number` integer NOT NULL,
  `clue` text NOT NULL,
  `is_completed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_item_clues_game_item_id_clue_number_unique` ON `game_item_clues` (`game_item_id`, `clue_number`);
--> statement-breakpoint
CREATE TABLE `game_item_guesses` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `game_item_id` integer NOT NULL REFERENCES `game_items`(`id`),
  `player_id` integer NOT NULL REFERENCES `participants`(`id`),
  `guess` text,
  `is_correct` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_item_guesses_game_item_id_player_id_unique` ON `game_item_guesses` (`game_item_id`, `player_id`);
