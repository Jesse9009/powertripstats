export interface Clue {
  id: number;
  number: number;
  text: string;
  completed: boolean;
}

export interface Guess {
  playerId: number;
  playerName: string;
  guess: string | null;
  isCorrect: boolean;
  clueNumber: number;
}

export interface ItemData {
  itemNumber: number;
  itemType: string;
  answer: string;
  clues: Clue[];
  guesses: Guess[];
}

export interface PlayerLike {
  firstName: string;
  lastName: string;
  nickname: string | null;
}

export interface ItemState {
  finalReadClueNumber: number | null;
  winnerGuess: Guess | null;
  nobody: boolean;
  eliminatedPlayerNames: string[];
  guessesByClue: Map<number, Guess[]>;
}

export function fullName(p: PlayerLike): string {
  return `${p.firstName} ${p.lastName}`;
}

export function shortName(p: PlayerLike): string {
  return p.nickname ?? p.firstName;
}

export function deriveItemState(item: ItemData): ItemState {
  const readClueNumbers = item.clues.map((c) => c.number);
  const finalReadClueNumber = readClueNumbers.length
    ? Math.max(...readClueNumbers)
    : null;

  const winnerGuess = item.guesses.find((g) => g.isCorrect) ?? null;
  const nobody = !winnerGuess;

  const eliminatedSet = new Set<string>();
  for (const g of item.guesses) {
    if (!g.isCorrect) eliminatedSet.add(g.playerName);
  }
  const eliminatedPlayerNames = Array.from(eliminatedSet);

  const guessesByClue = new Map<number, Guess[]>();
  for (const g of item.guesses) {
    const bucket =
      g.isCorrect && finalReadClueNumber !== null
        ? finalReadClueNumber
        : g.clueNumber;
    const list = guessesByClue.get(bucket) ?? [];
    list.push(g);
    guessesByClue.set(bucket, list);
  }

  return {
    finalReadClueNumber,
    winnerGuess,
    nobody,
    eliminatedPlayerNames,
    guessesByClue,
  };
}

export function computeScores(
  items: ItemData[],
  players: PlayerLike[],
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const p of players) scores.set(fullName(p), 0);
  for (const item of items) {
    const { winnerGuess } = deriveItemState(item);
    if (winnerGuess) {
      const name = winnerGuess.playerName;
      scores.set(name, (scores.get(name) ?? 0) + 1);
    }
  }
  return scores;
}

export interface OverallWinner {
  kind: 'winner' | 'tie' | 'none';
  name: string | null;
  score: number;
}

export function getOverallWinner(scores: Map<string, number>): OverallWinner {
  let top = -1;
  const winners: string[] = [];
  for (const [name, score] of scores) {
    if (score > top) {
      top = score;
      winners.length = 0;
      winners.push(name);
    } else if (score === top) {
      winners.push(name);
    }
  }
  if (top <= 0 || winners.length === 0)
    return { kind: 'none', name: null, score: 0 };
  if (winners.length > 1) return { kind: 'tie', name: null, score: top };
  return { kind: 'winner', name: winners[0], score: top };
}
