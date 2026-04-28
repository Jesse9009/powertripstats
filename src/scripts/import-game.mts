import { readFileSync } from 'fs';
import { z } from 'zod';
import { assertDb } from '../db/client.mts';
import {
  games,
  participants,
  locations,
  gameTypes,
  gameItemTypes,
  sponsors,
} from '../db/schema.mts';
import { addGameSchema, type AddGameInput } from '../lib/game-schema.ts';
import {
  findOrCreateInitialCombinationId,
  insertGameChildren,
} from '../app/actions.ts';

// ─── Friendly JSON schema (names instead of DB IDs) ────────────────────────

const importGameSchema = z.object({
  gameNumber: z.number().int().min(1),
  gameDate: z.string().min(1),
  hostName: z.string().min(1),
  playerNames: z.array(z.string().min(1)).min(1),
  initialsCombination: z.string().min(1),
  notes: z.string().optional(),
  videoUrl: z.string().url().optional(),
  audioUrl: z.string().url().optional(),
  location: z.string().min(1),
  gameTypes: z.array(z.string().min(1)).min(1),
  includePrize: z.boolean(),
  prizes: z.array(
    z.object({
      prize: z.string().min(1),
      beneficiaries: z.array(
        z.object({
          playerName: z.string().min(1),
          pickOrder: z.number().int().min(1),
          beneficiaryName: z.string().min(1),
        }),
      ),
    }),
  ),
  includeJackpot: z.boolean(),
  jackpot: z.object({
    oneCorrect: z.number().int().min(0),
    bothCorrect: z.number().int().min(0),
    callerName: z.string().optional(),
    callerGuessInitialsCombination: z.string().optional(),
  }),
  includeSponsors: z.boolean(),
  gameSponsorNames: z.array(z.string()),
  playerSponsors: z.array(
    z.object({
      playerName: z.string().min(1),
      sponsorName: z.string().min(1),
    }),
  ),
  items: z
    .array(
      z.object({
        gameItemType: z.string().min(1),
        fallbackAnswer: z.string().optional(),
        clues: z
          .array(
            z.object({
              clue: z.string().min(1),
              isCompleted: z.boolean(),
            }),
          )
          .min(1),
        guesses: z.array(
          z.object({
            playerName: z.string().min(1),
            guess: z.string().optional(),
            clueHeard: z.string().optional(),
            isCorrect: z.boolean(),
            clueNumber: z.number().int().min(1).optional(),
          }),
        ),
      }),
    )
    .min(10),
});

type ImportGameData = z.infer<typeof importGameSchema>;

// ─── Inline game data ───────────────────────────────────────────────────────
// Replace this with actual game data, or pass --file <path> to load from JSON.

const GAME_DATA: ImportGameData = {
  gameNumber: 1,
  gameDate: '2014-05-23',
  hostName: 'Cory Cove',
  playerNames: ['AJ Mansour', 'Chris Hawkey', 'Dan Barreiro', 'Paul Allen'],
  initialsCombination: 'AJ',
  notes: '',
  location: 'Studio A',
  gameTypes: ['regular'],
  includePrize: false,
  prizes: [],
  includeJackpot: false,
  jackpot: { oneCorrect: 0, bothCorrect: 0 },
  includeSponsors: false,
  gameSponsorNames: [],
  playerSponsors: [],
  items: [
    {
      gameItemType: 'regulation',
      clues: [{ clue: 'Replace with real clue', isCompleted: true }],
      guesses: [
        { playerName: 'AJ Mansour', guess: 'Replace with answer', isCorrect: true },
      ],
    },
    {
      gameItemType: 'regulation',
      clues: [{ clue: 'Replace with real clue', isCompleted: true }],
      guesses: [
        { playerName: 'AJ Mansour', guess: 'Replace with answer', isCorrect: true },
      ],
    },
    {
      gameItemType: 'regulation',
      clues: [{ clue: 'Replace with real clue', isCompleted: true }],
      guesses: [
        { playerName: 'AJ Mansour', guess: 'Replace with answer', isCorrect: true },
      ],
    },
    {
      gameItemType: 'regulation',
      clues: [{ clue: 'Replace with real clue', isCompleted: true }],
      guesses: [
        { playerName: 'AJ Mansour', guess: 'Replace with answer', isCorrect: true },
      ],
    },
    {
      gameItemType: 'regulation',
      clues: [{ clue: 'Replace with real clue', isCompleted: true }],
      guesses: [
        { playerName: 'AJ Mansour', guess: 'Replace with answer', isCorrect: true },
      ],
    },
    {
      gameItemType: 'regulation',
      clues: [{ clue: 'Replace with real clue', isCompleted: true }],
      guesses: [
        { playerName: 'AJ Mansour', guess: 'Replace with answer', isCorrect: true },
      ],
    },
    {
      gameItemType: 'regulation',
      clues: [{ clue: 'Replace with real clue', isCompleted: true }],
      guesses: [
        { playerName: 'AJ Mansour', guess: 'Replace with answer', isCorrect: true },
      ],
    },
    {
      gameItemType: 'regulation',
      clues: [{ clue: 'Replace with real clue', isCompleted: true }],
      guesses: [
        { playerName: 'AJ Mansour', guess: 'Replace with answer', isCorrect: true },
      ],
    },
    {
      gameItemType: 'regulation',
      clues: [{ clue: 'Replace with real clue', isCompleted: true }],
      guesses: [
        { playerName: 'AJ Mansour', guess: 'Replace with answer', isCorrect: true },
      ],
    },
    {
      gameItemType: 'regulation',
      clues: [{ clue: 'Replace with real clue', isCompleted: true }],
      guesses: [
        { playerName: 'AJ Mansour', guess: 'Replace with answer', isCorrect: true },
      ],
    },
  ],
};

// ─── Name resolution ────────────────────────────────────────────────────────

async function resolveNames(db: ReturnType<typeof assertDb>, data: ImportGameData): Promise<AddGameInput> {
  const errors: string[] = [];

  const [allParticipants, allLocations, allGameTypes, allGameItemTypes, allSponsors] =
    await Promise.all([
      db
        .select({
          id: participants.id,
          firstName: participants.firstName,
          middleName: participants.middleName,
          lastName: participants.lastName,
          nickname: participants.nickname,
        })
        .from(participants),
      db.select({ id: locations.id, name: locations.name }).from(locations),
      db.select({ id: gameTypes.id, type: gameTypes.type }).from(gameTypes),
      db
        .select({ id: gameItemTypes.id, type: gameItemTypes.type })
        .from(gameItemTypes),
      db.select({ id: sponsors.id, name: sponsors.name }).from(sponsors),
    ]);

  function findParticipant(name: string): number {
    const normalized = name.toLowerCase().trim();
    const matches = allParticipants.filter((p) => {
      const full = [p.firstName, p.middleName, p.lastName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const basic = `${p.firstName} ${p.lastName}`.toLowerCase();
      return (
        full === normalized ||
        basic === normalized ||
        p.nickname?.toLowerCase() === normalized
      );
    });
    if (matches.length === 0) {
      errors.push(`Participant not found: "${name}"`);
      return 0;
    }
    if (matches.length > 1) {
      errors.push(`Participant name is ambiguous: "${name}" matches ${matches.map(p => `${p.firstName} ${p.lastName} (id=${p.id})`).join(', ')}`);
      return 0;
    }
    return matches[0].id;
  }

  function findLocation(name: string): number {
    const match = allLocations.find(
      (l) => l.name.toLowerCase() === name.toLowerCase().trim(),
    );
    if (!match) {
      errors.push(`Location not found: "${name}"`);
      return 0;
    }
    return match.id;
  }

  function findGameType(name: string): number {
    const match = allGameTypes.find(
      (t) => t.type.toLowerCase() === name.toLowerCase().trim(),
    );
    if (!match) {
      errors.push(`Game type not found: "${name}"`);
      return 0;
    }
    return match.id;
  }

  function findGameItemType(name: string): number {
    const match = allGameItemTypes.find(
      (t) => t.type.toLowerCase() === name.toLowerCase().trim(),
    );
    if (!match) {
      errors.push(`Game item type not found: "${name}"`);
      return 0;
    }
    return match.id;
  }

  function findSponsor(name: string): number {
    const match = allSponsors.find(
      (s) => s.name.toLowerCase() === name.toLowerCase().trim(),
    );
    if (!match) {
      errors.push(`Sponsor not found: "${name}"`);
      return 0;
    }
    return match.id;
  }

  const resolved: AddGameInput = {
    gameNumber: data.gameNumber,
    gameDate: data.gameDate,
    hostParticipantId: findParticipant(data.hostName),
    playerIds: data.playerNames.map(findParticipant),
    initialsCombination: data.initialsCombination,
    notes: data.notes,
    videoUrl: data.videoUrl,
    audioUrl: data.audioUrl,
    locationId: findLocation(data.location),
    gameTypeIds: data.gameTypes.map(findGameType),
    includePrize: data.includePrize,
    prizes: data.prizes.map((p) => ({
      prize: p.prize,
      beneficiaries: p.beneficiaries.map((b) => ({
        playerId: findParticipant(b.playerName),
        pickOrder: b.pickOrder,
        beneficiaryName: b.beneficiaryName,
      })),
    })),
    includeJackpot: data.includeJackpot,
    jackpot: data.jackpot,
    includeSponsors: data.includeSponsors,
    gameSponsorIds: data.gameSponsorNames.map(findSponsor),
    playerSponsors: data.playerSponsors.map((ps) => ({
      playerId: findParticipant(ps.playerName),
      sponsorId: findSponsor(ps.sponsorName),
    })),
    items: data.items.map((item, i) => ({
      itemNumber: i + 1,
      gameItemTypeId: findGameItemType(item.gameItemType),
      fallbackAnswer: item.fallbackAnswer,
      clues: item.clues,
      guesses: item.guesses.map((g) => ({
        playerId: findParticipant(g.playerName),
        guess: g.guess,
        clueHeard: g.clueHeard,
        isCorrect: g.isCorrect,
        clueNumber: g.clueNumber,
      })),
    })),
  };

  if (errors.length > 0) {
    const uniqueErrors = [...new Set(errors)];
    throw new Error(
      `Name resolution failed:\n${uniqueErrors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }

  return resolved;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  const dryRun = args.includes('--dry-run');

  let rawData: unknown;
  if (fileIdx !== -1) {
    const filePath = args[fileIdx + 1];
    if (!filePath || filePath.startsWith('--')) {
      console.error('Error: --file requires a path argument');
      process.exit(1);
    }
    rawData = JSON.parse(readFileSync(filePath, 'utf-8'));
    console.log(`Loading game data from: ${filePath}`);
  } else {
    rawData = GAME_DATA;
    console.log('Using inline GAME_DATA constant');
  }

  // Step 1: Validate friendly format
  const parseResult = importGameSchema.safeParse(rawData);
  if (!parseResult.success) {
    console.error('\nInput validation failed:');
    for (const issue of parseResult.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  console.log('Input format valid.');

  // Step 2: Resolve names to DB IDs
  console.log('Resolving names to IDs...');
  const db = assertDb();
  let resolved: AddGameInput;
  try {
    resolved = await resolveNames(db, parseResult.data);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  // Step 3: Validate resolved data against addGameSchema (catches cross-field issues)
  const finalResult = addGameSchema.safeParse(resolved);
  if (!finalResult.success) {
    console.error('\nPost-resolution validation failed:');
    for (const issue of finalResult.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  console.log('All validation passed.');

  if (dryRun) {
    console.log('\nDry run — resolved input (ready to insert):');
    console.log(JSON.stringify(finalResult.data, null, 2));
    console.log('\nDry run complete. No data written.');
    process.exit(0);
  }

  // Step 4: Insert into DB (transaction without revalidatePath)
  console.log(`\nInserting game #${finalResult.data.gameNumber}...`);

  await db.transaction(async (tx) => {
    const initialsCombinationId = await findOrCreateInitialCombinationId(
      tx,
      finalResult.data.initialsCombination,
    );

    const createdGame = await tx
      .insert(games)
      .values({
        gameNumber: finalResult.data.gameNumber,
        gameDate: new Date(finalResult.data.gameDate),
        hostParticipantId: finalResult.data.hostParticipantId,
        initialCombinationId: initialsCombinationId,
        notes: finalResult.data.notes?.trim() || null,
        videoUrl: finalResult.data.videoUrl ?? null,
        audioUrl: finalResult.data.audioUrl ?? null,
        locationId: finalResult.data.locationId,
      })
      .returning({ id: games.id });

    const gameId = createdGame[0].id;
    await insertGameChildren(tx, gameId, finalResult.data, initialsCombinationId);
  });

  console.log(`Game #${finalResult.data.gameNumber} inserted successfully.`);
}

main().catch((e) => {
  console.error('Fatal error:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
