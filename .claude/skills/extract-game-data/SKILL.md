---
name: extract-game-data
description: Extract structured game data from a PowerTrip/Initials Game podcast transcript and write it as a JSON file ready for database import.
---

## Task

You will be given a game number. Read the transcript at:

```
src/lib/transcription/transcripts/converted/game_[GAME_NUMBER].txt
```

Extract the game data and write the result to:

```
game-data/toBeReviewed/game_[GAME_NUMBER].json
```

---

## Show format

"Initials Game" — trivia show where one host reads clues; 2–5 contestants compete. The host NEVER plays.

- Each **item** has multiple clues read one at a time.
- A player **buzzes in** by shouting their name. They may buzz after any clue, or mid-clue.
- **Correct guess**: player names the right answer — the `guess` text IS the answer.
- **Incorrect guess**: player guesses wrong; they cannot guess again on that item.
- Each item has at most **one** correct guess.
- At the start of each episode, a caller phones in and guesses a 2-letter initials combo for the jackpot.

---

## Output format

Match the `importGameSchema` defined in `src/scripts/import-games.mts`. Use **names** (not IDs) — the import script resolves them. Append `uncertainFields` at the bottom of the JSON object (it is not part of the schema).

### Top-level fields

| Field                 | Type     | Notes                                                                                                                         |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `gameNumber`          | integer  | Provided to you                                                                                                               |
| `gameDate`            | string   | ISO date, e.g. `"2024-06-20"`                                                                                                 |
| `hostName`            | string   | Host's spoken name. Must NOT appear in `playerNames`.                                                                         |
| `playerNames`         | string[] | Contestants only. Min 1.                                                                                                      |
| `initialsCombination` | string   | 2-char uppercase initials for jackpot (e.g. `"BP"`) — this is the show's current jackpot letter combo, NOT the caller's guess |
| `notes`               | string?  | Noteworthy events: first-time player, new rule, record broken, etc. Omit if nothing notable.                                  |
| `videoUrl`            | string?  | Only if explicitly mentioned in transcript                                                                                    |
| `audioUrl`            | string?  | Only if explicitly mentioned in transcript                                                                                    |
| `location`            | string   | Venue/location name as spoken. Required.                                                                                      |
| `gameTypes`           | string[] | Options: `"regular"`, `"major"`, `"tournament"`. Default: `["regular"]`                                                       |
| `includePrize`        | boolean  | `true` if prizes are mentioned                                                                                                |
| `prizes`              | array    | Prize objects (see below). Use `[]` if `includePrize: false`.                                                                 |
| `includeJackpot`      | boolean  | `true` if a jackpot segment is present                                                                                        |
| `jackpot`             | object   | Required. See below.                                                                                                          |
| `includeSponsors`     | boolean  | `true` if sponsors are mentioned                                                                                              |
| `gameSponsorNames`    | string[] | Sponsor names as spoken. Use `[]` if `includeSponsors: false`.                                                                |
| `playerSponsors`      | object[] | Per-player sponsor entries. Use `[]` if `includeSponsors: false`.                                                             |

### `jackpot` object

```json
{
  "oneCorrect": 250,
  "bothCorrect": 74000,
  "callerName": "Dean from Rochester",
  "callerGuessInitialsCombination": "BK"
}
```

- `oneCorrect` and `bothCorrect`: integer dollar amounts. Normalize spoken: "fifteen hundred" → `1500`, "$1.5 grand" → `1500`, "two thousand" → `2000`.
- `callerGuessInitialsCombination`: exactly 2 uppercase letters — the caller's guess, not the show's current combo.
- `callerName`: free text, not a participant lookup.

### `prizes` array

```json
[
  {
    "prize": "Trip to Miami",
    "beneficiaries": [
      {
        "playerName": "AJ Mansour",
        "pickOrder": 1,
        "beneficiaryName": "AJ's wife"
      }
    ]
  }
]
```

### `playerSponsors` array

```json
[{ "playerName": "AJ Mansour", "sponsorName": "Acme Corp" }]
```

### `items` array

Each item is an object with `gameItemType`, `clues`, `guesses`, and optionally `fallbackAnswer`:

```json
{
  "gameItemType": "regulation",
  "clues": [{ "clue": "Clue text here", "isCompleted": true }],
  "guesses": [
    { "playerName": "AJ Mansour", "guess": "Baked Potato", "isCorrect": true }
  ]
}
```

- `gameItemType`: `"regulation"` (default) or `"tiebreaker"`.
- `fallbackAnswer`: include ONLY when no player guessed correctly. Omit when a correct guess exists.
- Items are auto-numbered in order — do not include `itemNumber`.
- Clue text should start with a capital letter.
- Each word in guesses should be capitalized.

---

## Clue completion (`isCompleted`) — decision tree

Apply in order:

1. Player buzzes mid-clue AND guess is **correct** → `isCompleted: false`
2. Player buzzes mid-clue AND guess is **incorrect** → host continues reading the full clue → `isCompleted: true`
3. No mid-clue buzz (full clue was read before any buzz) → `isCompleted: true`
4. Ambiguous (can't tell from transcript) → `isCompleted: true` AND add field path to `uncertainFields`

---

## Guess rules

- `clueNumber`: set ONLY for **incorrect** guesses where the player buzzed before the last clue. Omit for correct guesses.
- `clueHeard`: set ONLY when a player buzzed mid-clue. Contains the partial clue text read before they buzzed. Goes on the guess, not on the clue.
- Buzz with no answer spoken: `{ "playerName": "Paul Lambert", "guess": "", "isCorrect": false }`
- Correct guess text: the exact words the player spoke.

---

## Name matching

Known participants are listed in `src/db/participants.js`. Match spoken names against this list. Transcription noise is common — use the closest match. Flag in `uncertainFields` only if truly ambiguous between two candidates.

- `hostName` must NOT appear in `playerNames`.
- `callerName` is free text; do not look it up in participants.

---

## Strict rules

- Extract ONLY what is explicitly stated. Never infer or assume values.
- If a value is ambiguous or uncertain, add its dot-notation JSON path to `uncertainFields` (e.g. `"items.0.guesses.0.guess"`).
- If a required value cannot be determined at all, flag it in `uncertainFields`. If an optional value cannot be determined, omit the field.

---

## Final output

Write ONLY valid JSON to the output file — no markdown, no explanation. The JSON must match `importGameSchema` from `src/scripts/import-games.mts`, with `uncertainFields` appended as an extra array:

```json
{
  "gameNumber": 540,
  "gameDate": "2024-06-20",
  "hostName": "Cory Cove",
  "playerNames": ["AJ Mansour", "Mike Grimm", "Zach Halverson"],
  "initialsCombination": "BP",
  "location": "Studio",
  "gameTypes": ["regular"],
  "includePrize": false,
  "prizes": [],
  "includeJackpot": true,
  "jackpot": {
    "oneCorrect": 250,
    "bothCorrect": 74000,
    "callerName": "Dean from Rochester",
    "callerGuessInitialsCombination": "BK"
  },
  "includeSponsors": false,
  "gameSponsorNames": [],
  "playerSponsors": [],
  "items": [...],
  "uncertainFields": ["items.11.clues.1.clue"]
}
```
