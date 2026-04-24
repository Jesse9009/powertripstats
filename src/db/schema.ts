import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Lookup / reference tables
// ---------------------------------------------------------------------------

export const participants = sqliteTable("participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  nickname: text("nickname"),
  imageUrl: text("image_url"),
});

export const initialCombinations = sqliteTable("initial_combinations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  combination: text("combination").notNull().unique(),
});

export const gameTypes = sqliteTable("game_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull().unique(),
});

export const gameItemTypes = sqliteTable("game_item_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull().unique(),
});

export const sponsors = sqliteTable("sponsors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

// ---------------------------------------------------------------------------
// Core game tables
// ---------------------------------------------------------------------------

export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameNumber: integer("game_number").notNull(),
  gameDate: integer("game_date", { mode: "timestamp_ms" }).notNull(),
  hostParticipantId: integer("host_participant_id")
    .notNull()
    .references(() => participants.id),
  initialCombinationId: integer("initial_combination_id")
    .notNull()
    .references(() => initialCombinations.id),
  notes: text("notes"),
  videoUrl: text("video_url"),
  audioUrl: text("audio_url"),
  locationId: integer("location_id").references(() => locations.id),
});

export const gameGameTypes = sqliteTable(
  "game_game_types",
  {
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    gameTypeId: integer("game_type_id")
      .notNull()
      .references(() => gameTypes.id),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.gameTypeId] })]
);

export const gamePlayers = sqliteTable(
  "game_players",
  {
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => participants.id),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.playerId] })]
);

// ---------------------------------------------------------------------------
// Prize / jackpot tables
// ---------------------------------------------------------------------------

export const gamePrizes = sqliteTable("game_prizes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id),
  prize: text("prize").notNull(),
});

export const playerPrizeBeneficiaries = sqliteTable(
  "player_prize_beneficiaries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gamePrizeId: integer("game_prize_id")
      .notNull()
      .references(() => gamePrizes.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => participants.id),
    pickOrder: integer("pick_order").notNull(),
    beneficiaryName: text("beneficiary_name").notNull(),
  }
);

export const jackpots = sqliteTable("jackpots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id),
  oneCorrect: integer("one_correct").notNull(),
  bothCorrect: integer("both_correct").notNull(),
  callerName: text("caller_name"),
  callerGuessInitialsCombinationId: integer(
    "caller_guess_initials_combination_id"
  ).references(() => initialCombinations.id),
});

// ---------------------------------------------------------------------------
// Sponsor join tables
// ---------------------------------------------------------------------------

export const gameSponsors = sqliteTable(
  "game_sponsors",
  {
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    sponsorId: integer("sponsor_id")
      .notNull()
      .references(() => sponsors.id),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.sponsorId] })]
);

export const gamePlayerSponsors = sqliteTable(
  "game_player_sponsors",
  {
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    sponsorId: integer("sponsor_id")
      .notNull()
      .references(() => sponsors.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => participants.id),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.sponsorId, t.playerId] })]
);

// ---------------------------------------------------------------------------
// Game item tables
// ---------------------------------------------------------------------------

export const gameItems = sqliteTable(
  "game_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    itemNumber: integer("item_number").notNull(),
    gameItemTypeId: integer("game_item_type_id")
      .notNull()
      .references(() => gameItemTypes.id),
    itemAnswer: text("item_answer").notNull(),
  },
  (t) => [unique().on(t.gameId, t.itemNumber)]
);

export const gameItemClues = sqliteTable(
  "game_item_clues",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameItemId: integer("game_item_id")
      .notNull()
      .references(() => gameItems.id),
    clueNumber: integer("clue_number").notNull(),
    clue: text("clue").notNull(),
    isCompleted: integer("is_completed", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (t) => [unique().on(t.gameItemId, t.clueNumber)]
);

export const gameItemGuesses = sqliteTable(
  "game_item_guesses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameItemId: integer("game_item_id")
      .notNull()
      .references(() => gameItems.id),
    gameItemClueId: integer("game_item_clue_id")
      .notNull()
      .references(() => gameItemClues.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => participants.id),
    guess: text("guess"),
    clueHeard: text("clue_heard"),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [unique().on(t.gameItemId, t.playerId)]
);

// ---------------------------------------------------------------------------
// Auth tables (better-auth + admin plugin)
// ---------------------------------------------------------------------------

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  role: text("role"),
  banned: integer("banned", { mode: "boolean" }),
  banReason: text("banReason"),
  banExpires: integer("banExpires", { mode: "timestamp_ms" }),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonatedBy"),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", {
    mode: "timestamp_ms",
  }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
    mode: "timestamp_ms",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;

export type InitialCombination = typeof initialCombinations.$inferSelect;
export type NewInitialCombination = typeof initialCombinations.$inferInsert;

export type GameType = typeof gameTypes.$inferSelect;
export type NewGameType = typeof gameTypes.$inferInsert;

export type GameItemType = typeof gameItemTypes.$inferSelect;
export type NewGameItemType = typeof gameItemTypes.$inferInsert;

export type Sponsor = typeof sponsors.$inferSelect;
export type NewSponsor = typeof sponsors.$inferInsert;

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type GameGameType = typeof gameGameTypes.$inferSelect;
export type NewGameGameType = typeof gameGameTypes.$inferInsert;

export type GamePlayer = typeof gamePlayers.$inferSelect;
export type NewGamePlayer = typeof gamePlayers.$inferInsert;

export type GamePrize = typeof gamePrizes.$inferSelect;
export type NewGamePrize = typeof gamePrizes.$inferInsert;

export type PlayerPrizeBeneficiary = typeof playerPrizeBeneficiaries.$inferSelect;
export type NewPlayerPrizeBeneficiary = typeof playerPrizeBeneficiaries.$inferInsert;

export type Jackpot = typeof jackpots.$inferSelect;
export type NewJackpot = typeof jackpots.$inferInsert;

export type GameSponsor = typeof gameSponsors.$inferSelect;
export type NewGameSponsor = typeof gameGameTypes.$inferInsert;

export type GamePlayerSponsor = typeof gamePlayerSponsors.$inferSelect;
export type NewGamePlayerSponsor = typeof gamePlayerSponsors.$inferInsert;

export type GameItem = typeof gameItems.$inferSelect;
export type NewGameItem = typeof gameItems.$inferInsert;

export type GameItemClue = typeof gameItemClues.$inferSelect;
export type NewGameItemClue = typeof gameItemClues.$inferInsert;

export type GameItemGuess = typeof gameItemGuesses.$inferSelect;
export type NewGameItemGuess = typeof gameItemGuesses.$inferInsert;
