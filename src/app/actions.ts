'use server';

import { revalidatePath } from 'next/cache';

import { assertDb, getDb } from '@/db/client.mts';
import { submitTranscription, getTranscriptStatus } from '@/lib/transcription/assemblyai';
import { extractGameData } from '@/lib/transcription/extract';
import type { PollResult } from '@/lib/transcription/types';
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
} from '@/db/schema.mts';
import { asc, count, desc, eq, sql, and } from 'drizzle-orm';
import { formatFullName } from '@/lib/utils';
import { z } from 'zod';
import { addGameSchema, type AddGameInput } from '@/lib/game-schema.mts';
import {
  findOrCreateInitialCombinationId,
  insertGameChildren,
} from '@/lib/game-db.mts';

const db = getDb();

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
      hostMiddleName: participants.middleName,
      hostLastName: participants.lastName,
      hostNickname: participants.nickname,
      initialsCombination: initialCombinations.combination,
      players: sql<string | null>`(
        SELECT group_concat(player_name, ', ')
        FROM (
          SELECT
            CASE WHEN p.middle_name IS NOT NULL AND p.middle_name != ''
              THEN p.first_name || ' ' || p.middle_name || ' ' || p.last_name
              ELSE p.first_name || ' ' || p.last_name
            END as player_name
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
             ${participants.firstName} ||
             CASE WHEN ${participants.middleName} IS NOT NULL AND ${participants.middleName} != ''
               THEN ' ' || ${participants.middleName}
               ELSE ''
             END ||
             ' ' || ${participants.lastName} ||
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
        middleName: participants.middleName,
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
  middleName?: string;
  lastName: string;
  nickname?: string;
  imageUrl?: string;
}) {
  try {
    await db?.insert(participants).values({
      firstName: data.firstName,
      middleName: data.middleName || null,
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
          videoUrl: parsed.videoUrl ?? null,
          audioUrl: parsed.audioUrl ?? null,
          locationId: parsed.locationId,
        })
        .returning({ id: games.id });

      const gameId = createdGame[0].id;

      await insertGameChildren(tx, gameId, parsed, initialsCombinationId);

      return gameId;
    });

    revalidatePath('/admin/games');
    revalidatePath('/games');
    revalidatePath(`/games/${parsed.gameNumber}`);
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

export async function updateGame(gameId: number, data: AddGameInput) {
  try {
    const parsed = addGameSchema.parse(data);
    const database = assertDb();

    await database.transaction(async (tx) => {
      const initialsCombinationId = await findOrCreateInitialCombinationId(
        tx,
        parsed.initialsCombination,
      );

      // Update the games row
      await tx
        .update(games)
        .set({
          gameNumber: parsed.gameNumber,
          gameDate: new Date(parsed.gameDate),
          hostParticipantId: parsed.hostParticipantId,
          initialCombinationId: initialsCombinationId,
          notes: parsed.notes?.trim() || null,
          videoUrl: parsed.videoUrl ?? null,
          audioUrl: parsed.audioUrl ?? null,
          locationId: parsed.locationId,
        })
        .where(eq(games.id, gameId));

      // Delete all child rows in FK-safe order
      const gameItemIds = await tx
        .select({ id: gameItems.id })
        .from(gameItems)
        .where(eq(gameItems.gameId, gameId));

      const itemIds = gameItemIds.map((i) => i.id);

      if (itemIds.length > 0) {
        const gameItemClueIds = await tx
          .select({ id: gameItemClues.id })
          .from(gameItemClues)
          .where(sql`${gameItemClues.gameItemId} IN ${itemIds}`);

        const clueIds = gameItemClueIds.map((c) => c.id);

        if (clueIds.length > 0) {
          await tx
            .delete(gameItemGuesses)
            .where(sql`${gameItemGuesses.gameItemClueId} IN ${clueIds}`);
        }

        await tx
          .delete(gameItemClues)
          .where(sql`${gameItemClues.gameItemId} IN ${itemIds}`);
      }

      await tx.delete(gameItems).where(eq(gameItems.gameId, gameId));

      const gamePrizesRows = await tx
        .select({ id: gamePrizes.id })
        .from(gamePrizes)
        .where(eq(gamePrizes.gameId, gameId));

      const prizeIds = gamePrizesRows.map((p) => p.id);

      if (prizeIds.length > 0) {
        await tx
          .delete(playerPrizeBeneficiaries)
          .where(sql`${playerPrizeBeneficiaries.gamePrizeId} IN ${prizeIds}`);
      }

      await tx.delete(gamePrizes).where(eq(gamePrizes.gameId, gameId));
      await tx
        .delete(gamePlayerSponsors)
        .where(eq(gamePlayerSponsors.gameId, gameId));
      await tx.delete(gameSponsors).where(eq(gameSponsors.gameId, gameId));
      await tx.delete(jackpots).where(eq(jackpots.gameId, gameId));
      await tx.delete(gamePlayers).where(eq(gamePlayers.gameId, gameId));
      await tx.delete(gameGameTypes).where(eq(gameGameTypes.gameId, gameId));

      // Re-insert all children
      await insertGameChildren(tx, gameId, parsed, initialsCombinationId);
    });

    revalidatePath('/admin/games');
    revalidatePath('/games');
    revalidatePath(`/games/${parsed.gameNumber}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating game:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Please correct the highlighted fields.',
      };
    }

    return { success: false, error: 'Failed to update game' };
  }
}

export async function getGameByGameNumber(gameNumber: number) {
  if (!db) return null;

  // Game basic info
  const game = await db
    .select({
      id: games.id,
      gameNumber: games.gameNumber,
      gameDate: games.gameDate,
      notes: games.notes,
      hostParticipantId: games.hostParticipantId,
      hostFirstName: participants.firstName,
      hostMiddleName: participants.middleName,
      hostLastName: participants.lastName,
      hostNickname: participants.nickname,
      initialsCombination: initialCombinations.combination,
      locationId: games.locationId,
      locationName: locations.name,
      videoUrl: games.videoUrl,
      audioUrl: games.audioUrl,
    })
    .from(games)
    .innerJoin(participants, eq(games.hostParticipantId, participants.id))
    .innerJoin(
      initialCombinations,
      eq(games.initialCombinationId, initialCombinations.id),
    )
    .leftJoin(locations, eq(games.locationId, locations.id))
    .where(eq(games.gameNumber, gameNumber))
    .limit(1);

  if (!game[0]) return null;

  const gameId = game[0].id;

  // Fetch game types
  const gameTypesData = await db
    .select({ gameTypeId: gameGameTypes.gameTypeId })
    .from(gameGameTypes)
    .where(eq(gameGameTypes.gameId, gameId));

  // Fetch players with sponsors
  const gamePlayersData = await db
    .select({
      playerId: gamePlayers.playerId,
      firstName: participants.firstName,
      middleName: participants.middleName,
      lastName: participants.lastName,
      nickname: participants.nickname,
      sponsorId: gamePlayerSponsors.sponsorId,
      sponsorName: sponsors.name,
    })
    .from(gamePlayers)
    .innerJoin(participants, eq(gamePlayers.playerId, participants.id))
    .leftJoin(
      gamePlayerSponsors,
      and(
        eq(gamePlayerSponsors.gameId, gameId),
        eq(gamePlayerSponsors.playerId, gamePlayers.playerId),
      ),
    )
    .leftJoin(sponsors, eq(gamePlayerSponsors.sponsorId, sponsors.id))
    .where(eq(gamePlayers.gameId, gameId));

  // Fetch prizes with beneficiaries
  const prizesData = await db
    .select({
      prizeId: gamePrizes.id,
      prize: gamePrizes.prize,
      beneficiaryId: playerPrizeBeneficiaries.playerId,
      beneficiaryFirstName: participants.firstName,
      beneficiaryMiddleName: participants.middleName,
      beneficiaryLastName: participants.lastName,
      beneficiaryName: playerPrizeBeneficiaries.beneficiaryName,
      pickOrder: playerPrizeBeneficiaries.pickOrder,
    })
    .from(gamePrizes)
    .leftJoin(
      playerPrizeBeneficiaries,
      eq(playerPrizeBeneficiaries.gamePrizeId, gamePrizes.id),
    )
    .leftJoin(
      participants,
      eq(playerPrizeBeneficiaries.playerId, participants.id),
    )
    .where(eq(gamePrizes.gameId, gameId))
    .orderBy(gamePrizes.id, asc(playerPrizeBeneficiaries.pickOrder));

  // Fetch items with clues and guesses - FIXED to properly associate guesses with clues
  const itemsData = await db
    .select({
      itemId: gameItems.id,
      itemNumber: gameItems.itemNumber,
      gameItemTypeId: gameItems.gameItemTypeId,
      itemType: gameItemTypes.type,
      itemAnswer: gameItems.itemAnswer,
      clueId: gameItemClues.id,
      clueNumber: gameItemClues.clueNumber,
      clueText: gameItemClues.clue,
      clueCompleted: gameItemClues.isCompleted,
      guessId: gameItemGuesses.id,
      guessPlayerId: gameItemGuesses.playerId,
      guessPlayerFirstName: participants.firstName,
      guessPlayerMiddleName: participants.middleName,
      guessPlayerLastName: participants.lastName,
      guessText: gameItemGuesses.guess,
      isCorrect: gameItemGuesses.isCorrect,
      guessClueNumber: gameItemClues.clueNumber,
      guessClueHeard: gameItemGuesses.clueHeard,
    })
    .from(gameItems)
    .innerJoin(gameItemTypes, eq(gameItems.gameItemTypeId, gameItemTypes.id))
    .leftJoin(gameItemClues, eq(gameItemClues.gameItemId, gameItems.id))
    .leftJoin(
      gameItemGuesses,
      eq(gameItemGuesses.gameItemClueId, gameItemClues.id),
    )
    .leftJoin(participants, eq(gameItemGuesses.playerId, participants.id))
    .where(eq(gameItems.gameId, gameId));

  // Build where clause and order by using raw SQL to avoid null column issues
  const filteredItemsData = itemsData.filter((i) => i.itemId > 0);
  filteredItemsData.sort((a, b) => {
    if (a.itemNumber !== b.itemNumber) return a.itemNumber - b.itemNumber;
    if ((a.clueNumber ?? 0) !== (b.clueNumber ?? 0))
      return (a.clueNumber ?? 0) - (b.clueNumber ?? 0);
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
    .leftJoin(
      initialCombinations,
      eq(jackpots.callerGuessInitialsCombinationId, initialCombinations.id),
    )
    .where(eq(jackpots.gameId, gameId))
    .limit(1);

  // Fetch game sponsors
  const gameSponsorsData = await db
    .select({
      sponsorId: gameSponsors.sponsorId,
      sponsorName: sponsors.name,
    })
    .from(gameSponsors)
    .innerJoin(sponsors, eq(gameSponsors.sponsorId, sponsors.id))
    .where(eq(gameSponsors.gameId, gameId));

  // Transform data - FIXED to deduplicate
  const players = new Map<
    number,
    {
      firstName: string;
      middleName: string | null;
      lastName: string;
      nickname: string | null;
      sponsors: string[];
      sponsorIds: number[];
    }
  >();
  gamePlayersData.forEach((p) => {
    if (!players.has(p.playerId)) {
      players.set(p.playerId, {
        firstName: p.firstName,
        middleName: p.middleName,
        lastName: p.lastName,
        nickname: p.nickname,
        sponsors: [],
        sponsorIds: [],
      });
    }
    if (p.sponsorId && p.sponsorName) {
      const existing = players.get(p.playerId)!;
      if (!existing.sponsorIds.includes(p.sponsorId)) {
        existing.sponsors.push(p.sponsorName);
        existing.sponsorIds.push(p.sponsorId);
      }
    }
  });

  const prizes = new Map<
    number,
    {
      prize: string;
      beneficiaries: {
        playerId: number;
        name: string;
        beneficiaryName: string;
        pickOrder: number;
      }[];
    }
  >();
  prizesData.forEach((p) => {
    if (!prizes.has(p.prizeId)) {
      prizes.set(p.prizeId, { prize: p.prize, beneficiaries: [] });
    }
    if (
      p.beneficiaryId &&
      p.beneficiaryFirstName &&
      p.beneficiaryLastName &&
      p.pickOrder !== null
    ) {
      prizes.get(p.prizeId)!.beneficiaries.push({
        playerId: p.beneficiaryId,
        name: formatFullName(p.beneficiaryFirstName, p.beneficiaryMiddleName, p.beneficiaryLastName),
        beneficiaryName: p.beneficiaryName ?? '',
        pickOrder: p.pickOrder,
      });
    }
  });

  const items = new Map<
    number,
    {
      itemNumber: number;
      gameItemTypeId: number;
      itemType: string;
      answer: string;
      clues: { id: number; number: number; text: string; completed: boolean }[];
      guesses: {
        playerId: number;
        playerName: string;
        guess: string | null;
        clueHeard: string | null;
        isCorrect: boolean;
        clueNumber: number;
      }[];
    }
  >();
  filteredItemsData.forEach((i) => {
    if (!items.has(i.itemId)) {
      items.set(i.itemId, {
        itemNumber: i.itemNumber,
        gameItemTypeId: i.gameItemTypeId,
        itemType: i.itemType,
        answer: i.itemAnswer,
        clues: [],
        guesses: [],
      });
    }
    // FIXED: Check for duplicate before pushing and ensure clue has required non-null fields
    if (
      i.clueId &&
      i.clueNumber !== null &&
      i.clueText !== null &&
      i.clueCompleted !== null &&
      !items.get(i.itemId)!.clues.some((c) => c.id === i.clueId)
    ) {
      items.get(i.itemId)!.clues.push({
        id: i.clueId,
        number: i.clueNumber,
        text: i.clueText,
        completed: i.clueCompleted,
      });
    }
    // FIXED: Check for duplicate guesses before pushing and ensure guess has required non-null fields
    if (
      i.guessId &&
      i.guessPlayerId &&
      i.guessClueNumber !== null &&
      i.isCorrect !== null &&
      !items
        .get(i.itemId)!
        .guesses.some(
          (g) =>
            g.playerId === i.guessPlayerId &&
            g.clueNumber === i.guessClueNumber,
        )
    ) {
      items.get(i.itemId)!.guesses.push({
        playerId: i.guessPlayerId,
        playerName: formatFullName(i.guessPlayerFirstName || '', i.guessPlayerMiddleName, i.guessPlayerLastName || ''),
        guess: i.guessText,
        clueHeard: i.guessClueHeard,
        isCorrect: i.isCorrect,
        clueNumber: i.guessClueNumber,
      });
    }
  });

  return {
    ...game[0],
    gameTypeIds: gameTypesData.map((gt) => gt.gameTypeId),
    players: Array.from(players.entries()).map(([playerId, p]) => ({
      playerId,
      ...p,
    })),
    prizes: Array.from(prizes.values()),
    items: Array.from(items.values()).sort(
      (a, b) => a.itemNumber - b.itemNumber,
    ),
    jackpot: jackpotData[0] || null,
    gameSponsors: gameSponsorsData.map((s) => s.sponsorName),
    gameSponsorIds: gameSponsorsData.map((s) => s.sponsorId),
  };
}

export async function startTranscription(audioUrl: string): Promise<{ jobId: string }> {
  return submitTranscription(audioUrl);
}

export async function pollTranscription(jobId: string): Promise<PollResult> {
  const result = await getTranscriptStatus(jobId);

  if (result.status !== 'completed' && result.status !== 'error') {
    return { status: 'pending' };
  }

  if (result.status === 'error') {
    return { status: 'error', message: result.error };
  }

  // result.status is now guaranteed to be 'completed'
  const db = getDb();
  if (!db) return { status: 'error', message: 'Database not configured' };

  const [participantRows, itemTypeRows] = await Promise.all([
    db
      .select({
        id: participants.id,
        firstName: participants.firstName,
        middleName: participants.middleName,
        lastName: participants.lastName,
        nickname: participants.nickname,
      })
      .from(participants),
    db.select({ id: gameItemTypes.id, type: gameItemTypes.type }).from(gameItemTypes),
  ]);

  try {
    const extraction = await extractGameData(result.text, participantRows, itemTypeRows);
    return { status: 'completed', extraction };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Extraction failed' };
  }
}
