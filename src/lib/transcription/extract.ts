import Anthropic from '@anthropic-ai/sdk';
import type { ExtractedGameData, ExtractionResult } from './types';

type Participant = {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  nickname: string | null;
};
type GameItemType = { id: number; type: string };

type ClaudeOutput = {
  gameNumber?: number;
  hostName?: string;
  playerNames?: string[];
  items?: Array<{
    itemTypeName: string;
    fallbackAnswer?: string;
    clues: Array<{ clue: string; isNotCompleted: boolean }>;
    guesses: Array<{
      playerName: string;
      guess?: string;
      clueHeard?: string;
      isIncorrect: boolean;
      clueNumber?: number;
    }>;
  }>;
  includeJackpot?: boolean;
  jackpot?: {
    oneCorrect?: number;
    bothCorrect?: number;
    callerName?: string;
    callerGuessInitialsCombination?: string;
  };
  uncertainFields: string[];
};

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
  return new Anthropic({ apiKey });
}

function resolveParticipant(name: string, participants: Participant[]): number | null {
  const lower = name.toLowerCase().trim();
  const match = participants.find(
    (p) =>
      p.firstName.toLowerCase() === lower ||
      p.lastName.toLowerCase() === lower ||
      p.nickname?.toLowerCase() === lower ||
      `${p.firstName} ${p.lastName}`.toLowerCase() === lower,
  );
  return match?.id ?? null;
}

function resolveItemType(name: string, itemTypes: GameItemType[]): number | null {
  const lower = name.toLowerCase().trim();
  const match = itemTypes.find((t) => t.type.toLowerCase() === lower);
  return match?.id ?? null;
}

const SYSTEM_PROMPT = `You are extracting structured data from a podcast transcript of a trivia game show called PowerTrip.

STRICT RULES:
- Extract ONLY what is explicitly stated. Never infer or assume values.
- If a value is ambiguous or you are unsure, add its dot-notation field path (e.g. "items.0.guesses.0.guess") to uncertainFields.
- If a value cannot be determined at all, omit the field.
- isNotCompleted for a clue means the host stopped reading it partway through.
- isIncorrect for a guess means the player guessed wrong.
- Use the exact spoken name for hostName and playerNames — the server resolves to IDs.
- For itemTypeName, use the closest matching name from the provided list.

Return ONLY valid JSON (no markdown, no explanation) matching this exact shape:
{
  "gameNumber": number,
  "hostName": string,
  "playerNames": string[],
  "items": [
    {
      "itemTypeName": string,
      "fallbackAnswer": string,
      "clues": [{ "clue": string, "isNotCompleted": boolean }],
      "guesses": [{ "playerName": string, "guess": string, "clueHeard": string, "isIncorrect": boolean, "clueNumber": number }]
    }
  ],
  "includeJackpot": boolean,
  "jackpot": { "oneCorrect": number, "bothCorrect": number, "callerName": string, "callerGuessInitialsCombination": string },
  "uncertainFields": string[]
}`;

export async function extractGameData(
  transcript: string,
  participants: Participant[],
  itemTypes: GameItemType[],
): Promise<ExtractionResult> {
  const client = getClient();

  const participantList = participants
    .map(
      (p) =>
        `${p.firstName} ${p.lastName}${p.nickname ? ` (${p.nickname})` : ''}`,
    )
    .join('\n');

  const itemTypeList = itemTypes.map((t) => `"${t.type}"`).join(', ');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Transcript:\n${transcript}\n\nKnown participants:\n${participantList}\n\nKnown item types: ${itemTypeList}`,
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content');
  }

  let raw: ClaudeOutput;
  try {
    raw = JSON.parse(textBlock.text) as ClaudeOutput;
  } catch {
    throw new Error(`Claude returned invalid JSON: ${textBlock.text.slice(0, 1000)}`);
  }

  const uncertainFields = [...(raw.uncertainFields ?? [])];
  const data: ExtractedGameData = {};

  if (raw.gameNumber !== undefined) {
    data.gameNumber = raw.gameNumber;
  }

  if (raw.hostName) {
    const id = resolveParticipant(raw.hostName, participants);
    if (id !== null) {
      data.hostParticipantId = id;
    } else {
      uncertainFields.push('hostParticipantId');
    }
  }

  if (raw.playerNames?.length) {
    const resolvedIds: number[] = [];
    raw.playerNames.forEach((name, i) => {
      const id = resolveParticipant(name, participants);
      if (id !== null) {
        resolvedIds.push(id);
      } else {
        uncertainFields.push(`playerIds.${i}`);
      }
    });
    if (resolvedIds.length > 0) data.playerIds = resolvedIds;
  }

  if (raw.items?.length) {
    data.items = raw.items.map((item, itemIndex) => {
      const gameItemTypeId = resolveItemType(item.itemTypeName, itemTypes);
      if (gameItemTypeId === null) {
        uncertainFields.push(`items.${itemIndex}.gameItemTypeId`);
      }

      return {
        gameItemTypeId: gameItemTypeId ?? 1,
        fallbackAnswer: item.fallbackAnswer,
        clues: item.clues ?? [],
        guesses: (item.guesses ?? []).map((guess, guessIndex) => {
          const playerId = resolveParticipant(guess.playerName, participants);
          if (playerId === null) {
            uncertainFields.push(`items.${itemIndex}.guesses.${guessIndex}.playerId`);
          }
          return {
            playerId: playerId ?? 0,
            guess: guess.guess,
            clueHeard: guess.clueHeard,
            isIncorrect: guess.isIncorrect,
            clueNumber: guess.clueNumber,
          };
        }),
      };
    });
  }

  if (raw.includeJackpot !== undefined) data.includeJackpot = raw.includeJackpot;

  if (raw.jackpot) {
    data.jackpot = {
      oneCorrect: raw.jackpot.oneCorrect,
      bothCorrect: raw.jackpot.bothCorrect,
      callerName: raw.jackpot.callerName,
      callerGuessInitialsCombination: raw.jackpot.callerGuessInitialsCombination,
    };
  }

  return {
    data,
    uncertainFields: [...new Set(uncertainFields)],
    rawTranscript: transcript,
  };
}
