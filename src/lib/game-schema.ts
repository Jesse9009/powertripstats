// Schema lives here because 'use server' files can only export async functions — non-function exports like Zod schemas are forbidden by Next.js.

import { z } from 'zod';
import { uniqueNumbers } from '@/lib/utils';

export const idSchema = z.number().int().positive();

export const addGameSchema = z
  .object({
    gameNumber: z.number().int().min(1),
    gameDate: z.string().min(1),
    hostParticipantId: idSchema,
    playerIds: z.array(idSchema).min(1),
    initialsCombination: z.string().trim().min(1),
    notes: z.string().trim().optional(),
    videoUrl: z
      .string()
      .trim()
      .url()
      .refine((v) => v.startsWith('https://'), {
        message: 'URL must use https',
      })
      .optional(),
    audioUrl: z
      .string()
      .trim()
      .url()
      .refine((v) => v.startsWith('https://'), {
        message: 'URL must use https',
      })
      .optional(),
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
              clueHeard: z.string().optional(),
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
