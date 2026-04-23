import type { GameFormData } from '@/components/AddGameForm';
import type { getGameById } from '@/app/actions';

type GameData = NonNullable<Awaited<ReturnType<typeof getGameById>>>;

/**
 * Converts a getGameById result into the AddGameForm's GameFormData shape.
 *
 * Key inversions:
 *  - DB isCompleted  → form isNotCompleted (negated)
 *  - DB isCorrect    → form isIncorrect (negated)
 *
 * Key derivations:
 *  - includePrize    ← prizes.length > 0
 *  - includeJackpot  ← jackpot !== null
 *  - includeSponsors ← gameSponsorIds.length > 0 || any player has sponsorIds
 *  - gameDate        ← timestamp_ms → "YYYY-MM-DD" in UTC
 */
export function gameToFormValues(game: GameData): GameFormData {
  const gameDateObj = game.gameDate instanceof Date ? game.gameDate : new Date(game.gameDate);
  // Format as YYYY-MM-DD in UTC (avoids local timezone drift)
  const year = gameDateObj.getUTCFullYear();
  const month = String(gameDateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(gameDateObj.getUTCDate()).padStart(2, '0');
  const gameDate = `${year}-${month}-${day}`;

  const includePrize = game.prizes.length > 0;
  const includeJackpot = game.jackpot !== null;
  const includeSponsors =
    game.gameSponsorIds.length > 0 ||
    game.players.some((p) => p.sponsorIds.length > 0);

  const prizes = game.prizes.map((prize) => ({
    prize: prize.prize,
    beneficiaries: prize.beneficiaries.map((b) => ({
      playerId: b.playerId,
      pickOrder: b.pickOrder,
      beneficiaryName: b.beneficiaryName,
    })),
  }));

  // Build player sponsors list: one entry per (playerId, sponsorId) pair
  const playerSponsors: { playerId: number; sponsorId: number }[] = [];
  for (const player of game.players) {
    for (const sponsorId of player.sponsorIds) {
      playerSponsors.push({ playerId: player.playerId, sponsorId });
    }
  }

  const items = game.items.map((item) => {
    // Sort clues by number
    const sortedClues = [...item.clues].sort((a, b) => a.number - b.number);

    const clues = sortedClues.map((clue) => ({
      clue: clue.text,
      isNotCompleted: !clue.completed,
    }));

    // Each guess: find which clue number it was linked to
    const guesses = item.guesses.map((guess) => ({
      playerId: guess.playerId,
      guess: guess.isCorrect ? (item.answer ?? '') : (guess.guess ?? ''),
      clueHeard: guess.clueHeard ?? '',
      isIncorrect: !guess.isCorrect,
      clueNumber: guess.clueNumber === sortedClues.length ? undefined : guess.clueNumber,
    }));

    // If no guesses with players, provide one empty slot
    const finalGuesses =
      guesses.length > 0
        ? guesses
        : [{ playerId: 0, guess: '', clueHeard: '', isIncorrect: false, clueNumber: undefined }];

    // Determine fallbackAnswer: used when no correct guess exists
    const hasCorrectGuess = item.guesses.some((g) => g.isCorrect);
    const fallbackAnswer = hasCorrectGuess ? '' : item.answer;

    return {
      gameItemTypeId: item.gameItemTypeId,
      fallbackAnswer,
      clues,
      guesses: finalGuesses,
    };
  });

  return {
    gameNumber: game.gameNumber,
    gameDate,
    hostParticipantId: game.hostParticipantId,
    playerIds: game.players.map((p) => p.playerId),
    initialsCombination: game.initialsCombination,
    notes: game.notes ?? '',
    videoUrl: game.videoUrl ?? '',
    audioUrl: game.audioUrl ?? '',
    locationId: game.locationId ?? 0,
    gameTypeIds: game.gameTypeIds,
    includePrize,
    prizes,
    includeJackpot,
    jackpot: {
      oneCorrect: game.jackpot?.oneCorrect ?? 0,
      bothCorrect: game.jackpot?.bothCorrect ?? 0,
      callerName: game.jackpot?.callerName ?? '',
      callerGuessInitialsCombination: game.jackpot?.callerGuessInitials ?? '',
    },
    includeSponsors,
    gameSponsorIds: game.gameSponsorIds,
    playerSponsors,
    items,
  };
}
