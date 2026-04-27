export type TranscriptStatus = 'queued' | 'processing' | 'completed' | 'error';

export type ExtractedGameData = {
  gameNumber?: number;
  hostParticipantId?: number;
  playerIds?: number[];
  items?: Array<{
    gameItemTypeId: number;
    fallbackAnswer?: string;
    clues: Array<{ clue: string; isNotCompleted: boolean }>;
    guesses: Array<{
      playerId: number;
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
};

export type ExtractionResult = {
  data: ExtractedGameData;
  uncertainFields: string[];
  rawTranscript: string;
};

export type PollResult =
  | { status: 'pending' }
  | { status: 'completed'; extraction: ExtractionResult }
  | { status: 'error'; message: string };
