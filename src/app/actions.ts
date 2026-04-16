'use server';

import { revalidatePath } from 'next/cache';

import { assertDb, getDb } from '@/db/client';
import {
  gameGameTypes,
  gameItemClues,
  gameItemGuesses,
  gameItemTypes,
  gameItems,
  gamePlayers,
  gamePlayerSponsors,
  gamePrizes,
  gameSponsors,
  gameTypes,
  games,
  initialCombinations,
  jackpots,
  locations,
  participants,
  playerPrizeBeneficiaries,
  sponsors,
} from '@/db/schema';
import { asc, count, desc, eq, sql, and } from 'drizzle-orm';
import { z } from 'zod';

const db = getDb();

const idSchema = z.number().int().positive();

const addGameSchema = z
  .object({
    gameNumber: z.number().int().min(1),
    gameDate: z.string().min(1),
    hostParticipantId: idSchema,
    playerIds: z.array(idSchema).min(1),
    initialsCombination: z.string().trim().min(1),
    notes: z.string().trim().optional(),
    locationId: idSchema,
    gameTypeIds: z.array(idSchema).min(1),
    includePrize: z.boolean(),
    prizes: z.array(
      z.object({
        prize: z.string().trim().min(1),
        beneficiaries: z.array(
          z.object({
            playerId: idSchema,
            pickOrder: z.number().int().min(1),
            beneficiaryName: z.string().trim().min(1),
          }),
        ),
      }),
    ),
    includeJackpot: z.boolean(),
    jackpot: z.object({
      oneCorrect: z.number().int().min(0),
      bothCorrect: z.number().int().min(0),
      callerName: z.string().trim().optional(),
      callerGuessInitialsCombination: z.string().trim().optional(),
    }),
    includeSponsors: z.boolean(),
    gameSponsorIds: z.array(idSchema),
    playerSponsors: z.array(
      z.object({
        playerId: idSchema,
        sponsorId: idSchema,
      }),
    ),
    items: z
      .array(
        z.object({
          itemNumber: z.number().int().min(1),
          gameItemTypeId: idSchema,
          fallbackAnswer: z.string().trim().optional(),
          clues: z
            .array(
              z.object({
                clue: z.string().trim().min(1),
                isCompleted: z.boolean(),
              }),
            )
            .min(1),
          guesses: z.array(
            z.object({
              playerId: idSchema,
              guess: z.string().optional(),
              isCorrect: z.boolean(),
              clueNumber: z.number().int().min(1).optional(),
            }),
          ),
        }),
      )
      .min(10),
  })
  .superRefine((value, ctx) => {
    const uniquePlayerIds = uniqueNumbers(value.playerIds);
    const playerIdSet = new Set(uniquePlayerIds);

    if (value.hostParticipantId && playerIdSet.has(value.hostParticipantId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Host must be excluded from players in this game.',
        path: ['playerIds'],
      });
    }

    if (uniquePlayerIds.length !== value.playerIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Players in this game must be unique.',
        path: ['playerIds'],
      });
    }

    value.items.forEach((item, itemIndex) => {
      item.guesses.forEach((guess, guessIndex) => {
        if (!playerIdSet.has(guess.playerId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Guess player must be in players in this game.',
            path: ['items', itemIndex, 'guesses', guessIndex, 'playerId'],
          });
        }

        if (guess.clueNumber && guess.clueNumber > item.clues.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Guess clue number must be a valid clue for this item.',
            path: ['items', itemIndex, 'guesses', guessIndex, 'clueNumber'],
          });
        }
      });

      const correctGuess = item.guesses.find((guess) => guess.isCorrect);
      const correctGuessCount = item.guesses.filter(
        (guess) => guess.isCorrect,
      ).length;
      const correctGuessText = correctGuess?.guess?.trim() ?? '';
      const fallbackAnswer = item.fallbackAnswer?.trim() ?? '';

      if (correctGuessCount > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Only one guess can be marked correct per item.',
          path: ['items', itemIndex, 'guesses'],
        });
      }

      if (correctGuess && !correctGuessText) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Correct guess must include guess text.',
          path: ['items', itemIndex, 'guesses'],
        });
      }

      if (!correctGuessText && !fallbackAnswer) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Add a correct guess text or provide a fallback answer for this item.',
          path: ['items', itemIndex, 'fallbackAnswer'],
        });
      }
    });

    value.prizes.forEach((prize, prizeIndex) => {
      prize.beneficiaries.forEach((beneficiary, beneficiaryIndex) => {
        if (!playerIdSet.has(beneficiary.playerId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Beneficiary player must be in players in this game.',
            path: [
              'prizes',
              prizeIndex,
              'beneficiaries',
              beneficiaryIndex,
              'playerId',
            ],
          });
        }
      });
    });

    value.playerSponsors.forEach((playerSponsor, playerSponsorIndex) => {
      if (!playerIdSet.has(playerSponsor.playerId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Player sponsor entry must reference a player in this game.',
          path: ['playerSponsors', playerSponsorIndex, 'playerId'],
        });
      }
    });
  });

export type AddGameInput = z.infer<typeof addGameSchema>;

type DbTransaction = Parameters<
  Parameters<ReturnType<typeof assertDb>['transaction']>[0]
>[0];

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values));
}

async function findOrCreateInitialCombinationId(
  tx: DbTransaction,
  combination: string,
) {
  const normalized = combination.toUpperCase();

  const existing = await tx
    .select({ id: initialCombinations.id })
    .from(initialCombinations)
    .where(eq(initialCombinations.combination, normalized))
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const created = await tx
    .insert(initialCombinations)
    .values({ combination: normalized })
    .returning({ id: initialCombinations.id });

  return created[0].id;
}

export async function getParticipants(limit: number = 20, offset: number = 0) {
  return await db
    ?.select()
    .from(participants)
    .orderBy(asc(participants.id))
    .limit(limit)
    .offset(offset);
}

export async function getTotalParticipants() {
  if (!db) {
    return [{ total: 0 }];
  }
  return await db.select({ total: count() }).from(participants);
}

export async function getGames(limit: number = 20, offset: number = 0) {
  return await db
    ?.select({
      id: games.id,
      gameNumber: games.gameNumber,
      gameDate: games.gameDate,
      hostFirstName: participants.firstName,
      hostLastName: participants.lastName,
      hostNickname: participants.nickname,
      initialsCombination: initialCombinations.combination,
      players: sql<string | null>`(
        SELECT group_concat(player_name, ', ')
        FROM (
          SELECT
            p.first_name || ' ' || p.last_name as player_name
          FROM game_players gp
          INNER JOIN participants p
            ON p.id = gp.player_id
          WHERE gp.game_id = ${games.id}
          ORDER BY p.first_name ASC, p.last_name ASC
        )
      )`,
      winner: sql<string | null>`(
         WITH player_scores AS (
           SELECT 
              ${gameItemGuesses.playerId} as player_id,
              COUNT(${gameItemGuesses.id}) as correct_count
           FROM ${gameItemGuesses}
           INNER JOIN ${gameItems}
             ON ${gameItems.id} = ${gameItemGuesses.gameItemId}
           WHERE ${gameItems.gameId} = ${games.id}
             AND ${gameItemGuesses.isCorrect} = 1
           GROUP BY ${gameItemGuesses.playerId}
         ),
         max_score AS (
           SELECT MAX(correct_count) as max_correct
           FROM player_scores
         ),
         winners AS (
           SELECT 
             ${participants.firstName} || ' ' || ${participants.lastName} ||
             CASE 
               WHEN ${participants.nickname} IS NOT NULL 
               THEN ' (' || ${participants.nickname} || ')'
               ELSE ''
             END as winner_name
           FROM player_scores
           INNER JOIN ${participants}
             ON ${participants.id} = player_scores.player_id
           INNER JOIN max_score
             ON player_scores.correct_count = max_score.max_correct
           ORDER BY ${participants.firstName} ASC, ${participants.lastName} ASC
         )
         SELECT group_concat(winner_name, ', ')
         FROM winners
       )`,
    })
    .from(games)
    .innerJoin(participants, eq(games.hostParticipantId, participants.id))
    .innerJoin(
      initialCombinations,
      eq(games.initialCombinationId, initialCombinations.id),
    )
    .orderBy(asc(games.gameDate), desc(games.id))
    .limit(limit)
    .offset(offset);
}

export async function getTotalGames() {
  if (!db) {
    return [{ total: 0 }];
  }

  return await db.select({ total: count() }).from(games);
}

export async function getGameFormOptions() {
  if (!db) {
    return {
      participants: [],
      gameTypes: [],
      gameItemTypes: [],
      sponsors: [],
      locations: [],
    };
  }

  const [
    participantsResult,
    gameTypesResult,
    gameItemTypesResult,
    sponsorsResult,
    locationsResult,
  ] = await Promise.all([
    db
      .select({
        id: participants.id,
        firstName: participants.firstName,
        lastName: participants.lastName,
        nickname: participants.nickname,
      })
      .from(participants)
      .orderBy(asc(participants.firstName), asc(participants.lastName)),
    db
      .select({ id: gameTypes.id, type: gameTypes.type })
      .from(gameTypes)
      .orderBy(asc(gameTypes.id)),
    db
      .select({ id: gameItemTypes.id, type: gameItemTypes.type })
      .from(gameItemTypes)
      .orderBy(asc(gameItemTypes.id)),
    db
      .select({ id: sponsors.id, name: sponsors.name })
      .from(sponsors)
      .orderBy(asc(sponsors.name)),
    db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .orderBy(asc(locations.id)),
  ]);

  return {
    participants: participantsResult,
    gameTypes: gameTypesResult,
    gameItemTypes: gameItemTypesResult,
    sponsors: sponsorsResult,
    locations: locationsResult,
  };
}

export async function addParticipant(data: {
  firstName: string;
  lastName: string;
  nickname?: string;
  imageUrl?: string;
}) {
  try {
    await db?.insert(participants).values({
      firstName: data.firstName,
      lastName: data.lastName,
      nickname: data.nickname || null,
      imageUrl: data.imageUrl || null,
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding participant:', error);
    return { success: false, error: 'Failed to add participant' };
  }
}

export async function addGame(data: AddGameInput) {
  try {
    const parsed = addGameSchema.parse(data);
    const database = assertDb();

    const transactionGameId = await database.transaction(async (tx) => {
      const uniqueGameTypeIds = uniqueNumbers(parsed.gameTypeIds);
      const uniquePlayerIds = uniqueNumbers(parsed.playerIds);
      const initialsCombinationId = await findOrCreateInitialCombinationId(
        tx,
        parsed.initialsCombination,
      );

      const createdGame = await tx
        .insert(games)
        .values({
          gameNumber: parsed.gameNumber,
          gameDate: new Date(parsed.gameDate),
          hostParticipantId: parsed.hostParticipantId,
          initialCombinationId: initialsCombinationId,
          notes: parsed.notes?.trim() || null,
          locationId: parsed.locationId,
        })
        .returning({ id: games.id });

      const gameId = createdGame[0].id;

      if (uniqueGameTypeIds.length > 0) {
        await tx.insert(gameGameTypes).values(
          uniqueGameTypeIds.map((gameTypeId) => ({
            gameId,
            gameTypeId,
          })),
        );
      }

      await tx.insert(gamePlayers).values(
        uniquePlayerIds.map((playerId) => ({
          gameId,
          playerId,
        })),
      );

      if (parsed.includePrize) {
        for (const prize of parsed.prizes) {
          const createdPrize = await tx
            .insert(gamePrizes)
            .values({
              gameId,
              prize: prize.prize,
            })
            .returning({ id: gamePrizes.id });

          const gamePrizeId = createdPrize[0].id;

          if (prize.beneficiaries.length > 0) {
            await tx.insert(playerPrizeBeneficiaries).values(
              prize.beneficiaries.map((beneficiary) => ({
                gamePrizeId,
                playerId: beneficiary.playerId,
                pickOrder: beneficiary.pickOrder,
                beneficiaryName: beneficiary.beneficiaryName,
              })),
            );
          }
        }
      }

      if (parsed.includeJackpot) {
        const jackpotInitials =
          parsed.jackpot.callerGuessInitialsCombination?.trim() ?? '';

        const callerGuessInitialsCombinationId = jackpotInitials
          ? await findOrCreateInitialCombinationId(tx, jackpotInitials)
          : null;

        await tx.insert(jackpots).values({
          gameId,
          oneCorrect: parsed.jackpot.oneCorrect,
          bothCorrect: parsed.jackpot.bothCorrect,
          callerName: parsed.jackpot.callerName?.trim() || null,
          callerGuessInitialsCombinationId,
        });
      }

      if (parsed.includeSponsors) {
        const uniqueGameSponsorIds = uniqueNumbers(parsed.gameSponsorIds);

        if (uniqueGameSponsorIds.length > 0) {
          await tx.insert(gameSponsors).values(
            uniqueGameSponsorIds.map((sponsorId) => ({
              gameId,
              sponsorId,
            })),
          );
        }

        const uniquePlayerSponsors = parsed.playerSponsors.filter(
          (value, index, array) =>
            index ===
            array.findIndex(
              (candidate) =>
                candidate.playerId === value.playerId &&
                candidate.sponsorId === value.sponsorId,
            ),
        );

        if (uniquePlayerSponsors.length > 0) {
          await tx.insert(gamePlayerSponsors).values(
            uniquePlayerSponsors.map((entry) => ({
              gameId,
              playerId: entry.playerId,
              sponsorId: entry.sponsorId,
            })),
          );
        }
      }

      for (const item of parsed.items) {
        const correctGuess = item.guesses.find((guess) => guess.isCorrect);
        const itemAnswer =
          correctGuess?.guess?.trim() || item.fallbackAnswer?.trim() || null;

        if (!itemAnswer) {
          throw new Error(
            `Missing answer for item ${item.itemNumber}; no correct guess text or fallback answer.`,
          );
        }

        const createdItem = await tx
          .insert(gameItems)
          .values({
            gameId,
            itemNumber: item.itemNumber,
            gameItemTypeId: item.gameItemTypeId,
            itemAnswer,
          })
          .returning({ id: gameItems.id });

        const gameItemId = createdItem[0].id;

        const createdClues = await tx
          .insert(gameItemClues)
          .values(
            item.clues.map((clue, index) => ({
              gameItemId,
              clueNumber: index + 1,
              clue: clue.clue,
              isCompleted: clue.isCompleted,
            })),
          )
          .returning({
            id: gameItemClues.id,
            clueNumber: gameItemClues.clueNumber,
          });

        const clueIdByNumber = new Map(
          createdClues.map((clue) => [clue.clueNumber, clue.id]),
        );
        const lastClueId = clueIdByNumber.get(item.clues.length);

        if (!lastClueId) {
          throw new Error(`Missing last clue for game item ${gameItemId}`);
        }

        const uniqueGuesses = item.guesses.filter(
          (value, index, array) =>
            index ===
            array.findIndex(
              (candidate) => candidate.playerId === value.playerId,
            ),
        );

        if (uniqueGuesses.length > 0) {
          await tx.insert(gameItemGuesses).values(
            uniqueGuesses.map((guess) => {
              const clueNumber = guess.clueNumber ?? item.clues.length;
              const gameItemClueId = guess.isCorrect
                ? lastClueId
                : clueIdByNumber.get(clueNumber);

              if (!gameItemClueId) {
                throw new Error(
                  `Missing clue ${clueNumber} for game item ${gameItemId}`,
                );
              }

              return {
                gameItemId,
                gameItemClueId,
                playerId: guess.playerId,
                guess: guess.isCorrect ? null : guess.guess?.trim() || null,
                isCorrect: guess.isCorrect,
              };
            }),
          );
        }
      }

      return gameId;
    });

    revalidatePath('/admin/games');
    revalidatePath('/games');
    revalidatePath(`/games/${transactionGameId}`);
    return { success: true };
  } catch (error) {
    console.error('Error adding game:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Please correct the highlighted fields.',
      };
    }

    return { success: false, error: 'Failed to add game' };
  }
}

export async function getGameById(gameId: number) {
  if (!db) return null;

  // Game basic info
  const game = await db
    .select({
      id: games.id,
      gameNumber: games.gameNumber,
      gameDate: games.gameDate,
      notes: games.notes,
      hostFirstName: participants.firstName,
      hostLastName: participants.lastName,
      hostNickname: participants.nickname,
      initialsCombination: initialCombinations.combination,
    })
    .from(games)
    .innerJoin(participants, eq(games.hostParticipantId, participants.id))
    .innerJoin(initialCombinations, eq(games.initialCombinationId, initialCombinations.id))
    .where(eq(games.id, gameId))
    .limit(1);

  if (!game[0]) return null;

  // Fetch players with sponsors
  const gamePlayersData = await db
    .select({
      playerId: gamePlayers.playerId,
      firstName: participants.firstName,
      lastName: participants.lastName,
      nickname: participants.nickname,
      sponsorId: gamePlayerSponsors.sponsorId,
      sponsorName: sponsors.name,
    })
    .from(gamePlayers)
    .innerJoin(participants, eq(gamePlayers.playerId, participants.id))
    .leftJoin(gamePlayerSponsors, and(
      eq(gamePlayerSponsors.gameId, gameId),
      eq(gamePlayerSponsors.playerId, gamePlayers.playerId)
    ))
    .leftJoin(sponsors, eq(gamePlayerSponsors.sponsorId, sponsors.id))
    .where(eq(gamePlayers.gameId, gameId));

  // Fetch prizes with beneficiaries
  const prizesData = await db
    .select({
      prizeId: gamePrizes.id,
      prize: gamePrizes.prize,
      beneficiaryId: playerPrizeBeneficiaries.playerId,
      beneficiaryFirstName: participants.firstName,
      beneficiaryLastName: participants.lastName,
      pickOrder: playerPrizeBeneficiaries.pickOrder,
    })
    .from(gamePrizes)
    .leftJoin(playerPrizeBeneficiaries, eq(playerPrizeBeneficiaries.gamePrizeId, gamePrizes.id))
    .leftJoin(participants, eq(playerPrizeBeneficiaries.playerId, participants.id))
    .where(eq(gamePrizes.gameId, gameId))
    .orderBy(gamePrizes.id, asc(playerPrizeBeneficiaries.pickOrder));

  // Fetch items with clues and guesses - FIXED to properly associate guesses with clues
  const itemsData = await db
    .select({
      itemId: gameItems.id,
      itemNumber: gameItems.itemNumber,
      itemType: gameItemTypes.type,
      itemAnswer: gameItems.itemAnswer,
      clueId: gameItemClues.id,
      clueNumber: gameItemClues.clueNumber,
      clueText: gameItemClues.clue,
      clueCompleted: gameItemClues.isCompleted,
      guessId: gameItemGuesses.id,
      guessPlayerId: gameItemGuesses.playerId,
      guessPlayerFirstName: participants.firstName,
      guessPlayerLastName: participants.lastName,
      guessText: gameItemGuesses.guess,
      isCorrect: gameItemGuesses.isCorrect,
      guessClueNumber: gameItemClues.clueNumber,
    })
    .from(gameItems)
    .innerJoin(gameItemTypes, eq(gameItems.gameItemTypeId, gameItemTypes.id))
    .leftJoin(gameItemClues, eq(gameItemClues.gameItemId, gameItems.id))
    .leftJoin(gameItemGuesses, eq(gameItemGuesses.gameItemId, gameItems.id))
    .leftJoin(participants, eq(gameItemGuesses.playerId, participants.id));

  // Build where clause and order by using raw SQL to avoid null column issues
  const filteredItemsData = itemsData.filter(i => i.itemId > 0);
  filteredItemsData.sort((a, b) => {
    if (a.itemNumber !== b.itemNumber) return a.itemNumber - b.itemNumber;
    if ((a.clueNumber ?? 0) !== (b.clueNumber ?? 0)) return (a.clueNumber ?? 0) - (b.clueNumber ?? 0);
    return 0;
  });

  // Fetch jackpot
  const jackpotData = await db
    .select({
      oneCorrect: jackpots.oneCorrect,
      bothCorrect: jackpots.bothCorrect,
      callerName: jackpots.callerName,
      callerGuessInitials: initialCombinations.combination,
    })
    .from(jackpots)
    .leftJoin(initialCombinations, eq(jackpots.callerGuessInitialsCombinationId, initialCombinations.id))
    .where(eq(jackpots.gameId, gameId))
    .limit(1);

  // Fetch game sponsors
  const gameSponsorsData = await db
    .select({
      sponsorName: sponsors.name,
    })
    .from(gameSponsors)
    .innerJoin(sponsors, eq(gameSponsors.sponsorId, sponsors.id))
    .where(eq(gameSponsors.gameId, gameId));

  // Transform data - FIXED to deduplicate
  const players = new Map<number, { firstName: string; lastName: string; nickname: string | null; sponsors: string[] }>();
  gamePlayersData.forEach(p => {
    if (!players.has(p.playerId)) {
      players.set(p.playerId, { firstName: p.firstName, lastName: p.lastName, nickname: p.nickname, sponsors: [] });
    }
    if (p.sponsorId && p.sponsorName) {
      const existing = players.get(p.playerId)!;
      if (!existing.sponsors.includes(p.sponsorName)) {
        existing.sponsors.push(p.sponsorName);
      }
    }
  });

  const prizes = new Map<number, { prize: string; beneficiaries: { name: string; pickOrder: number | null }[] }>();
  prizesData.forEach(p => {
    if (!prizes.has(p.prizeId)) {
      prizes.set(p.prizeId, { prize: p.prize, beneficiaries: [] });
    }
    if (p.beneficiaryId && p.beneficiaryFirstName && p.beneficiaryLastName) {
      prizes.get(p.prizeId)!.beneficiaries.push({
        name: `${p.beneficiaryFirstName} ${p.beneficiaryLastName}`,
        pickOrder: p.pickOrder,
      });
    }
  });

  const items = new Map<number, { itemNumber: number; itemType: string; answer: string; clues: { id: number; number: number | null; text: string | null; completed: boolean | null }[]; guesses: { playerId: number; playerName: string; guess: string | null; isCorrect: boolean | null; clueNumber: number | null }[] }>();
  filteredItemsData.forEach(i => {
    if (!items.has(i.itemId)) {
      items.set(i.itemId, { itemNumber: i.itemNumber, itemType: i.itemType, answer: i.itemAnswer, clues: [], guesses: [] });
    }
    // FIXED: Check for duplicate before pushing
    if (i.clueId && !items.get(i.itemId)!.clues.some(c => c.id === i.clueId)) {
      items.get(i.itemId)!.clues.push({ id: i.clueId, number: i.clueNumber, text: i.clueText, completed: i.clueCompleted });
    }
    // FIXED: Check for duplicate guesses before pushing
    if (i.guessId && i.guessPlayerId && !items.get(i.itemId)!.guesses.some(g => g.playerId === i.guessPlayerId && g.clueNumber === i.guessClueNumber)) {
      items.get(i.itemId)!.guesses.push({
        playerId: i.guessPlayerId,
        playerName: `${i.guessPlayerFirstName || ''} ${i.guessPlayerLastName || ''}`,
        guess: i.guessText,
        isCorrect: i.isCorrect,
        clueNumber: i.guessClueNumber,
      });
    }
  });

  return {
    ...game[0],
    players: Array.from(players.values()),
    prizes: Array.from(prizes.values()),
    items: Array.from(items.values()).sort((a, b) => a.itemNumber - b.itemNumber),
    jackpot: jackpotData[0] || null,
    gameSponsors: gameSponsorsData.map(s => s.sponsorName),
  };
}
