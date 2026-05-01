import { eq } from 'drizzle-orm';
import { assertDb } from '../db/client.mts';
import {
  gameItemClues,
  gameItemGuesses,
  gameItems,
  gameGameTypes,
  gamePlayers,
  gamePlayerSponsors,
  gamePrizes,
  gameSponsors,
  initialCombinations,
  jackpots,
  playerPrizeBeneficiaries,
} from '../db/schema.mts';
import type { AddGameInput } from './game-schema.mts';

type DbTransaction = Parameters<
  Parameters<ReturnType<typeof assertDb>['transaction']>[0]
>[0];

const uniqueNumbers = (values: number[]) => Array.from(new Set(values));

export async function findOrCreateInitialCombinationId(
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

export async function insertGameChildren(
  tx: DbTransaction,
  gameId: number,
  parsed: AddGameInput,
  initialsCombinationId: number,
) {
  const uniqueGameTypeIds = uniqueNumbers(parsed.gameTypeIds);
  const uniquePlayerIds = uniqueNumbers(parsed.playerIds);

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
        array.findIndex((candidate) => candidate.playerId === value.playerId),
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
            clueHeard: guess.clueHeard?.trim() || null,
            isCorrect: guess.isCorrect,
          };
        }),
      );
    }
  }
}
