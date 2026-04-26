# AssemblyAI Audio Transcription — Design Spec

**Date:** 2026-04-26  
**Status:** Approved

## Overview

Add a "Transcribe & Fill" button to the existing `AddGameForm` that takes an iHeart podcast URL from the `audioUrl` field, transcribes it via AssemblyAI, then uses the Claude API to extract structured game data and pre-fill the form. Fields where Claude is not fully confident are filled but visually flagged for manual review. Accuracy is the top priority — the system never guesses.

## Architecture

### New files

```
src/
  lib/
    transcription/
      assemblyai.ts    — AssemblyAI client: submit URL, poll status
      extract.ts       — Claude API client: transcript → structured GameFormData
      types.ts         — shared types (TranscriptStatus, ExtractionResult, PollResult)
```

### Modified files

- `src/app/actions.ts` — two new server actions: `startTranscription`, `pollTranscription`
- `src/components/AddGameForm.tsx` — "Transcribe & Fill" button, polling state, confidence flag overlay
- `.env.local.example` — add `ASSEMBLYAI_API_KEY` and `ANTHROPIC_API_KEY`

### Batch readiness

`assemblyai.ts` and `extract.ts` are pure utility modules with no form or UI dependency. A future batch process calls them directly without any changes to the UI layer.

## Types (`src/lib/transcription/types.ts`)

```typescript
type TranscriptStatus = 'queued' | 'processing' | 'completed' | 'error';

type ExtractionResult = {
  data: Partial<GameFormData>;      // only high-confidence fields
  uncertainFields: string[];        // field paths Claude found but isn't sure about
  rawTranscript: string;            // full transcript for manual reference
};

type PollResult =
  | { status: 'pending' }
  | { status: 'completed'; extraction: ExtractionResult }
  | { status: 'error'; message: string };
```

## Server Actions

Both are added to `src/app/actions.ts`.

### `startTranscription(audioUrl: string): Promise<{ jobId: string }>`

Submits the URL to AssemblyAI and returns immediately with a job ID. No waiting for transcription to complete.

### `pollTranscription(jobId: string): Promise<PollResult>`

Checks AssemblyAI job status:
- If still processing → returns `{ status: 'pending' }`
- If error → returns `{ status: 'error', message }`
- If complete → calls Claude API inline to extract structured data, returns `{ status: 'completed', extraction }`

The Claude extraction happens inside `pollTranscription` (not `startTranscription`) because the transcript is unavailable until AssemblyAI finishes. This keeps the client flow simple — it polls until it gets a terminal result.

## Form UI Changes (`AddGameForm.tsx`)

### Trigger

A **"Transcribe & Fill"** button appears adjacent to the `audioUrl` field. It is disabled when `audioUrl` is empty.

### Progress states

| State | UI |
|---|---|
| `queued` / `processing` | Spinner + "Transcribing audio…" + elapsed time. Polls every 5 seconds. |
| `error` | Red inline error message + Retry button. |
| `completed` | Success toast, form fills, progress UI clears. |

### Form filling

- High-confidence fields: filled silently via `setValue()`.
- Uncertain fields: filled via `setValue()` but stored in a `Set<string>` (`uncertainFields` state). These fields render with an amber border + ⚠ warning badge.
- Raw transcript: shown in a collapsible `<details>` section at the bottom of the form for manual reference.

### Fields expected to be extractable from audio

| Field | Extractable? |
|---|---|
| Game items (clues, guesses, correctness, clue heard, clue number) | Yes — primary value |
| Jackpot amounts, caller name, caller guess initials | Yes — usually explicitly spoken |
| Player names, host name | Yes — introduced at start of show |
| Game number | Often — usually announced |
| Prizes (name, beneficiaries, pick order) | Sometimes — may be mentioned |
| `gameDate`, `locationId`, `gameTypeIds`, `initialsCombination`, sponsors | No — not in audio; left blank |

## Claude Extraction Prompt Design

### Strict accuracy rules

- Extract **only what is explicitly stated** in the transcript.
- **Never infer, assume, or fill from context.**
- If a value is ambiguous or partially heard, put the field path in `uncertainFields` rather than omitting it.
- If a value cannot be determined at all, omit the field from `data`.

### Name resolution

The transcript contains spoken names (e.g., "Jesse"), but the form needs numeric `playerId` / `hostParticipantId` values. Claude returns a `resolvedNames: Record<string, number | null>` map alongside the extraction:

- Exact match → resolved to the participant's DB ID.
- Partial match (e.g., "Jess" → "Jesse Anderson") → ID set to `null`, field path added to `uncertainFields`.
- No match → ID set to `null`, field path added to `uncertainFields`.

The server resolves the map against the `participants` list passed in the prompt.

### Item type resolution

`gameItemTypeId` is a DB integer. Claude returns the spoken item type name; the server resolves it to an ID using the `gameItemTypes` list passed in the prompt.

### Prompt structure

```
System:
You are extracting structured data from a podcast transcript of a trivia game show called PowerTrip.
Return ONLY what is explicitly stated. Never infer. Mark anything ambiguous or uncertain in uncertainFields.

User:
Transcript: <full transcript text>
Known participants: <id, firstName, lastName, nickname for each>
Known item types: <id, type for each>

Return JSON:
{
  data: Partial<GameFormData>,       // high-confidence fields only
  uncertainFields: string[],         // dot-notation field paths (e.g. "items.0.guesses.0.guess")
  resolvedNames: Record<string, number | null>
}
```

## Environment Variables

```
ASSEMBLYAI_API_KEY=   # from assemblyai.com (free tier available)
ANTHROPIC_API_KEY=    # from console.anthropic.com
```

Both are added to `.env.local.example` with empty values and comments.

## Future Batch Process

When the batch requirement arrives, a new server action (or API route) will:
1. Accept an array of `{ audioUrl, gameMetadata }` objects
2. Call `assemblyai.ts` utilities to submit all URLs and poll for completion
3. Call `extract.ts` utilities for each completed transcript
4. Insert extracted data directly via `addGame` (bypassing the form)

No changes to `assemblyai.ts` or `extract.ts` are required.
