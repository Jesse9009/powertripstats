'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Controller,
  type FieldError,
  type FieldErrors,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { addGame } from '@/app/actions';
import {
  SearchableCombobox,
  SearchableMultiCombobox,
  type ComboboxOption,
} from '@/components/ui/combobox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

function createSchema(gameTypes: GameTypeOption[]) {
  return z
    .object({
      gameNumber: z.number().int().min(1, 'Game number is required'),
      gameDate: z.string().min(1, 'Game date is required'),
      hostParticipantId: z.number().int().min(1, 'Host is required'),
      playerIds: z
        .array(z.number().int().positive())
        .min(1, 'Pick at least one active player'),
      initialsCombination: z
        .string()
        .trim()
        .max(2, 'Initials combination must be 2 characters')
        .min(2, 'Initials combination is required'),
      notes: z.string().trim().optional(),
      locationId: z.number().int().min(1, 'Location is required'),
      gameTypeIds: z
        .array(z.number().int().positive())
        .min(1, 'Pick at least one game type'),
      includePrize: z.boolean(),
      prizes: z.array(
        z.object({
          prize: z.string().trim().min(1, 'Prize is required'),
          beneficiaries: z.array(
            z.object({
              playerId: z.number().int().min(1, 'Player is required'),
              pickOrder: z.number().int().min(1, 'Pick order is required'),
              beneficiaryName: z
                .string()
                .trim()
                .min(1, 'Beneficiary name is required'),
            }),
          ),
        }),
      ),
      includeJackpot: z.boolean(),
      jackpot: z.object({
        oneCorrect: z.number().int().min(0, 'Must be 0 or higher'),
        bothCorrect: z.number().int().min(0, 'Must be 0 or higher'),
        callerName: z.string().optional(),
        callerGuessInitialsCombination: z.string().optional(),
      }),
      includeSponsors: z.boolean(),
      gameSponsorIds: z.array(z.number().int().positive()),
      playerSponsors: z.array(
        z.object({
          playerId: z.number().int().min(1, 'Player is required'),
          sponsorId: z.number().int().min(1, 'Sponsor is required'),
        }),
      ),
      items: z
        .array(
          z.object({
            gameItemTypeId: z.number().int().min(1, 'Item type is required'),
            fallbackAnswer: z.string().trim().optional(),
            clues: z
              .array(
                z.object({
                  clue: z.string().trim().min(1, 'Clue is required'),
                  isNotCompleted: z.boolean(),
                }),
              )
              .min(1, 'At least one clue is required'),
            guesses: z
              .array(
                z.object({
                  playerId: z.number().int().min(0),
                  guess: z.string().optional(),
                  clueHeard: z.string().optional(),
                  isIncorrect: z.boolean(),
                  clueNumber: z.number().int().min(1).optional(),
                }),
              )
              .refine((guesses) => {
                const selectedPlayerIds = guesses
                  .map((guess) => guess.playerId)
                  .filter((playerId) => playerId > 0);

                return (
                  new Set(selectedPlayerIds).size === selectedPlayerIds.length
                );
              }, 'Each player can only guess once per item'),
          }),
        )
        .min(1),
    })
    .superRefine((value, ctx) => {
      const isMajorGame = gameTypes.some(
        (gt) => value.gameTypeIds.includes(gt.id) && gt.type === 'major',
      );
      const minItems = isMajorGame ? 10 : 12;

      if (value.items.length < minItems) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `At least ${minItems} items are required for ${
            isMajorGame ? 'a major' : 'a non-major'
          } game.`,
          path: ['items'],
        });
      }
      const playerSet = new Set(value.playerIds);

      if (playerSet.has(value.hostParticipantId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Host must be excluded from active player list.',
          path: ['playerIds'],
        });
      }

      value.items.forEach((item, itemIndex) => {
        item.guesses.forEach((guess, guessIndex) => {
          if (guess.playerId === 0) {
            return;
          }

          if (!playerSet.has(guess.playerId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Guess player must be selected in players in this game.',
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

        const correctGuess = item.guesses.find((guess) => !guess.isIncorrect);
        const correctGuessCount = item.guesses.filter(
          (guess) => !guess.isIncorrect,
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
          if (!playerSet.has(beneficiary.playerId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Beneficiary must be selected in players in this game.',
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

      value.playerSponsors.forEach((entry, entryIndex) => {
        if (!playerSet.has(entry.playerId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Player sponsor entry must use players in this game.',
            path: ['playerSponsors', entryIndex, 'playerId'],
          });
        }
      });
    });
}

type GameFormData =
  ReturnType<typeof createSchema> extends z.ZodType<infer T> ? T : never;

type ParticipantOption = {
  id: number;
  firstName: string;
  lastName: string;
  nickname: string | null;
};

type GameTypeOption = {
  id: number;
  type: string;
};

type GameItemTypeOption = {
  id: number;
  type: string;
};

type SponsorOption = {
  id: number;
  name: string;
};

type LocationOption = {
  id: number;
  name: string;
};

interface AddGameFormProps {
  participants: ParticipantOption[];
  gameTypes: GameTypeOption[];
  gameItemTypes: GameItemTypeOption[];
  sponsors: SponsorOption[];
  locations: LocationOption[];
}

function createDefaultValues(): GameFormData {
  return {
    gameNumber: 1,
    gameDate: '',
    hostParticipantId: 0,
    playerIds: [],
    initialsCombination: '',
    notes: '',
    locationId: 0,
    gameTypeIds: [],
    includePrize: false,
    prizes: [],
    includeJackpot: false,
    jackpot: {
      oneCorrect: 0,
      bothCorrect: 0,
      callerName: '',
      callerGuessInitialsCombination: '',
    },
    includeSponsors: false,
    gameSponsorIds: [],
    playerSponsors: [],
    items: [
      {
        gameItemTypeId: 1,
        fallbackAnswer: '',
        clues: [{ clue: '', isNotCompleted: false }],
        guesses: [{ playerId: 0, guess: '', clueHeard: '', isIncorrect: false }],
      },
    ],
  };
}

function displayParticipant(participant: ParticipantOption) {
  const nickname = participant.nickname?.trim();
  const base = `${participant.firstName} ${participant.lastName}`;
  return nickname ? `${base} (${nickname})` : base;
}

interface GameItemFieldsProps {
  itemIndex: number;
  canRemove: boolean;
  removeItem: () => void;
  playerOptions: ComboboxOption[];
  gameItemTypes: GameItemTypeOption[];
  control: ReturnType<typeof useForm<GameFormData>>['control'];
  register: ReturnType<typeof useForm<GameFormData>>['register'];
  setValue: ReturnType<typeof useForm<GameFormData>>['setValue'];
  errors: ReturnType<typeof useForm<GameFormData>>['formState']['errors'];
}

function GameItemFields({
  itemIndex,
  canRemove,
  removeItem,
  playerOptions,
  gameItemTypes,
  control,
  register,
  setValue,
  errors,
}: GameItemFieldsProps) {
  const [isItemRemoveDialogOpen, setIsItemRemoveDialogOpen] = useState(false);
  const [clueToRemoveIndex, setClueToRemoveIndex] = useState<number | null>(
    null,
  );
  const [guessToRemoveIndex, setGuessToRemoveIndex] = useState<number | null>(
    null,
  );

  const cluesArray = useFieldArray({
    control,
    name: `items.${itemIndex}.clues`,
  });

  const guessesArray = useFieldArray({
    control,
    name: `items.${itemIndex}.guesses`,
  });

  const clues = useWatch({
    control,
    name: `items.${itemIndex}.clues`,
  });

  const guesses = useWatch({
    control,
    name: `items.${itemIndex}.guesses`,
  });

  const clueCount = clues?.length ?? 1;
  const lastClueNumber = Math.max(1, clueCount);
  const hasPlayerCorrectGuess =
    guesses?.some(
      (guess) => guess && guess.playerId > 0 && !guess.isIncorrect,
    ) ?? false;

  useEffect(() => {
    if (!guesses || guesses.length === 0) {
      return;
    }

    guesses.forEach((guess, guessIndex) => {
      if (guess?.clueNumber && guess.clueNumber > lastClueNumber) {
        setValue(
          `items.${itemIndex}.guesses.${guessIndex}.clueNumber`,
          undefined,
          { shouldValidate: true },
        );
      }
    });
  }, [guesses, itemIndex, lastClueNumber, setValue]);

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">Game Item {itemIndex + 1}</h3>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-7 w-7"
          aria-label={`Remove game item ${itemIndex + 1}`}
          tabIndex={-1}
          onClick={() => setIsItemRemoveDialogOpen(true)}
          disabled={!canRemove}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            htmlFor={`items.${itemIndex}.gameItemTypeId`}
          >
            Item Type
          </label>
          <select
            id={`items.${itemIndex}.gameItemTypeId`}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            {...register(`items.${itemIndex}.gameItemTypeId`, {
              valueAsNumber: true,
            })}
            defaultValue={1}
          >
            {gameItemTypes.map((itemType) => (
              <option key={itemType.id} value={itemType.id}>
                {itemType.type}
              </option>
            ))}
          </select>
          {errors.items?.[itemIndex]?.gameItemTypeId && (
            <p className="text-xs text-destructive">
              {errors.items[itemIndex]?.gameItemTypeId?.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-medium">Clues</h4>
        </div>

        {cluesArray.fields.map((clueField, clueIndex) => (
          <div
            key={clueField.id}
            className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_auto_auto]"
          >
            <div className="space-y-1">
              <label
                className="text-sm font-medium"
                htmlFor={`items.${itemIndex}.clues.${clueIndex}.clue`}
              >
                Clue {clueIndex + 1}
              </label>
              <Input
                id={`items.${itemIndex}.clues.${clueIndex}.clue`}
                autoComplete="off"
                {...register(`items.${itemIndex}.clues.${clueIndex}.clue`)}
              />
              {errors.items?.[itemIndex]?.clues?.[clueIndex]?.clue && (
                <p className="text-xs text-destructive">
                  {errors.items[itemIndex]?.clues?.[clueIndex]?.clue?.message}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                {...register(
                  `items.${itemIndex}.clues.${clueIndex}.isNotCompleted`,
                )}
              />
              Not Completed
            </label>

            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-7 w-7 self-end"
              aria-label={`Remove clue ${clueIndex + 1}`}
              tabIndex={-1}
              onClick={() => setClueToRemoveIndex(clueIndex)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        ))}

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const previousClueIndex = cluesArray.fields.length - 1;

              if (previousClueIndex >= 0) {
                setValue(
                  `items.${itemIndex}.clues.${previousClueIndex}.isNotCompleted`,
                  false,
                  { shouldValidate: true },
                );
              }

              cluesArray.append({ clue: '', isNotCompleted: false });
            }}
          >
            Add Clue
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-medium">Guesses</h4>
        </div>

        {guessesArray.fields.map((guessField, guessIndex) => (
          <div
            key={guessField.id}
            className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_1fr_140px_auto_auto]"
          >
            <div className="space-y-1">
              <label className="text-sm font-medium">Player</label>
              <Controller
                control={control}
                name={`items.${itemIndex}.guesses.${guessIndex}.playerId`}
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value}
                    onChange={field.onChange}
                    options={playerOptions}
                    placeholder="Select player"
                  />
                )}
              />
              {errors.items?.[itemIndex]?.guesses?.[guessIndex]?.playerId && (
                <p className="text-xs text-destructive">
                  {
                    errors.items[itemIndex]?.guesses?.[guessIndex]?.playerId
                      ?.message
                  }
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                className="text-sm font-medium"
                htmlFor={`items.${itemIndex}.guesses.${guessIndex}.guess`}
              >
                Guess
              </label>
              <Input
                id={`items.${itemIndex}.guesses.${guessIndex}.guess`}
                {...register(`items.${itemIndex}.guesses.${guessIndex}.guess`)}
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-sm font-medium"
                htmlFor={`items.${itemIndex}.guesses.${guessIndex}.clueHeard`}
              >
                Clue Heard (optional)
              </label>
              <Input
                id={`items.${itemIndex}.guesses.${guessIndex}.clueHeard`}
                {...register(`items.${itemIndex}.guesses.${guessIndex}.clueHeard`)}
                placeholder="Leave blank if full clue was heard"
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-sm font-medium"
                htmlFor={`items.${itemIndex}.guesses.${guessIndex}.clueNumber`}
              >
                After Clue (optional)
              </label>
              <select
                id={`items.${itemIndex}.guesses.${guessIndex}.clueNumber`}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                {...register(
                  `items.${itemIndex}.guesses.${guessIndex}.clueNumber`,
                  {
                    setValueAs: (value) => {
                      if (value === '') {
                        return undefined;
                      }

                      return Number(value);
                    },
                  },
                )}
              >
                <option value="">Last clue (default)</option>
                {Array.from({ length: clueCount }, (_, index) => {
                  const clueNumber = index + 1;
                  return (
                    <option key={clueNumber} value={clueNumber}>
                      {clueNumber}
                    </option>
                  );
                })}
              </select>
              {errors.items?.[itemIndex]?.guesses?.[guessIndex]?.clueNumber && (
                <p className="text-xs text-destructive">
                  {
                    errors.items[itemIndex]?.guesses?.[guessIndex]?.clueNumber
                      ?.message
                  }
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                {...register(
                  `items.${itemIndex}.guesses.${guessIndex}.isIncorrect`,
                )}
              />
              Incorrect
            </label>

            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-7 w-7 self-end"
              aria-label={`Remove guess ${guessIndex + 1}`}
              tabIndex={-1}
              onClick={() => setGuessToRemoveIndex(guessIndex)}
              disabled={guessesArray.fields.length <= 1}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        ))}

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              guessesArray.append({
                playerId: 0,
                guess: '',
                clueHeard: '',
                isIncorrect: false,
              })
            }
          >
            Add Guess
          </Button>
        </div>

        {errors.items?.[itemIndex]?.guesses?.root?.message && (
          <p className="text-xs text-destructive">
            {errors.items[itemIndex]?.guesses?.root?.message}
          </p>
        )}
      </div>

      {!hasPlayerCorrectGuess && (
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            htmlFor={`items.${itemIndex}.fallbackAnswer`}
          >
            Item Answer
          </label>
          <Input
            id={`items.${itemIndex}.fallbackAnswer`}
            {...register(`items.${itemIndex}.fallbackAnswer`)}
          />
          {errors.items?.[itemIndex]?.fallbackAnswer && (
            <p className="text-xs text-destructive">
              {errors.items[itemIndex]?.fallbackAnswer?.message}
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={isItemRemoveDialogOpen}
        onOpenChange={setIsItemRemoveDialogOpen}
        title="Remove this item?"
        onConfirm={removeItem}
      />

      <ConfirmDialog
        open={clueToRemoveIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setClueToRemoveIndex(null);
          }
        }}
        title="Remove this clue?"
        onConfirm={() => {
          if (clueToRemoveIndex !== null) {
            cluesArray.remove(clueToRemoveIndex);
            setClueToRemoveIndex(null);
          }
        }}
      />

      <ConfirmDialog
        open={guessToRemoveIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setGuessToRemoveIndex(null);
          }
        }}
        title="Remove this guess?"
        onConfirm={() => {
          if (guessToRemoveIndex !== null) {
            guessesArray.remove(guessToRemoveIndex);
            setGuessToRemoveIndex(null);
          }
        }}
      />
    </div>
  );
}

interface PrizeFieldsProps {
  prizeIndex: number;
  canRemove: boolean;
  removePrize: () => void;
  playerOptions: ComboboxOption[];
  control: ReturnType<typeof useForm<GameFormData>>['control'];
  register: ReturnType<typeof useForm<GameFormData>>['register'];
  errors: ReturnType<typeof useForm<GameFormData>>['formState']['errors'];
}

function PrizeFields({
  prizeIndex,
  canRemove,
  removePrize,
  playerOptions,
  control,
  register,
  errors,
}: PrizeFieldsProps) {
  const [isPrizeRemoveDialogOpen, setIsPrizeRemoveDialogOpen] = useState(false);
  const [beneficiaryToRemoveIndex, setBeneficiaryToRemoveIndex] = useState<
    number | null
  >(null);

  const beneficiariesArray = useFieldArray({
    control,
    name: `prizes.${prizeIndex}.beneficiaries`,
  });

  return (
    <div className="space-y-4 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">Prize {prizeIndex + 1}</h3>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-7 w-7"
          aria-label={`Remove prize ${prizeIndex + 1}`}
          tabIndex={-1}
          onClick={() => setIsPrizeRemoveDialogOpen(true)}
          disabled={!canRemove}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          htmlFor={`prizes.${prizeIndex}.prize`}
        >
          Prize
        </label>
        <Input
          id={`prizes.${prizeIndex}.prize`}
          {...register(`prizes.${prizeIndex}.prize`)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Beneficiaries</p>
        </div>

        {beneficiariesArray.fields.map((beneficiary, beneficiaryIndex) => (
          <div
            key={beneficiary.id}
            className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_140px_1fr_auto]"
          >
            <div className="space-y-1">
              <label className="text-sm font-medium">Player</label>
              <Controller
                control={control}
                name={`prizes.${prizeIndex}.beneficiaries.${beneficiaryIndex}.playerId`}
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value}
                    onChange={field.onChange}
                    options={playerOptions}
                    placeholder="Select player"
                  />
                )}
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-sm font-medium"
                htmlFor={`prizes.${prizeIndex}.beneficiaries.${beneficiaryIndex}.pickOrder`}
              >
                Pick Order
              </label>
              <Input
                id={`prizes.${prizeIndex}.beneficiaries.${beneficiaryIndex}.pickOrder`}
                type="number"
                min={1}
                {...register(
                  `prizes.${prizeIndex}.beneficiaries.${beneficiaryIndex}.pickOrder`,
                  {
                    valueAsNumber: true,
                  },
                )}
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-sm font-medium"
                htmlFor={`prizes.${prizeIndex}.beneficiaries.${beneficiaryIndex}.beneficiaryName`}
              >
                Beneficiary
              </label>
              <Input
                id={`prizes.${prizeIndex}.beneficiaries.${beneficiaryIndex}.beneficiaryName`}
                {...register(
                  `prizes.${prizeIndex}.beneficiaries.${beneficiaryIndex}.beneficiaryName`,
                )}
              />
            </div>

            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-7 w-7 self-end"
              aria-label={`Remove beneficiary ${beneficiaryIndex + 1}`}
              tabIndex={-1}
              onClick={() => setBeneficiaryToRemoveIndex(beneficiaryIndex)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        ))}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              beneficiariesArray.append({
                playerId: 0,
                pickOrder: beneficiariesArray.fields.length + 1,
                beneficiaryName: '',
              })
            }
          >
            Add Beneficiary
          </Button>
        </div>
      </div>

      {errors.prizes?.[prizeIndex]?.prize && (
        <p className="text-xs text-destructive">
          {errors.prizes[prizeIndex]?.prize?.message}
        </p>
      )}

      <ConfirmDialog
        open={isPrizeRemoveDialogOpen}
        onOpenChange={setIsPrizeRemoveDialogOpen}
        title="Remove this prize?"
        onConfirm={removePrize}
      />

      <ConfirmDialog
        open={beneficiaryToRemoveIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBeneficiaryToRemoveIndex(null);
          }
        }}
        title="Remove this beneficiary?"
        onConfirm={() => {
          if (beneficiaryToRemoveIndex !== null) {
            beneficiariesArray.remove(beneficiaryToRemoveIndex);
            setBeneficiaryToRemoveIndex(null);
          }
        }}
      />
    </div>
  );
}

export function AddGameForm({
  participants,
  gameTypes,
  gameItemTypes,
  sponsors,
  locations,
}: AddGameFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [playerSponsorToRemoveIndex, setPlayerSponsorToRemoveIndex] = useState<
    number | null
  >(null);

  const schema = useMemo(() => createSchema(gameTypes), [gameTypes]);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GameFormData>({
    resolver: zodResolver(schema),
    defaultValues: createDefaultValues(),
  });

  const itemArray = useFieldArray({ control, name: 'items' });
  const prizeArray = useFieldArray({ control, name: 'prizes' });
  const playerSponsorArray = useFieldArray({ control, name: 'playerSponsors' });

  const includePrize = useWatch({ control, name: 'includePrize' });
  const includeJackpot = useWatch({ control, name: 'includeJackpot' });
  const includeSponsors = useWatch({ control, name: 'includeSponsors' });
  const watchedSponsorIds = useWatch({ control, name: 'gameSponsorIds' });
  const hostParticipantId = useWatch({ control, name: 'hostParticipantId' });
  const watchedPlayerIds = useWatch({ control, name: 'playerIds' });
  const watchedGameTypeIds = useWatch({ control, name: 'gameTypeIds' });

  const selectedSponsorIds = useMemo(
    () => watchedSponsorIds ?? [],
    [watchedSponsorIds],
  );

  const isMajorGame = useMemo(
    () =>
      gameTypes.some(
        (gt) => (watchedGameTypeIds ?? []).includes(gt.id) && gt.type === 'major',
      ),
    [gameTypes, watchedGameTypeIds],
  );
  const minItems = isMajorGame ? 10 : 12;
  const playerIds = useMemo(() => watchedPlayerIds ?? [], [watchedPlayerIds]);

  const participantOptions = useMemo<ComboboxOption[]>(
    () =>
      participants.map((participant) => ({
        value: participant.id,
        label: displayParticipant(participant),
      })),
    [participants],
  );

  const playerPoolOptions = useMemo(
    () =>
      participantOptions.filter((option) => option.value !== hostParticipantId),
    [participantOptions, hostParticipantId],
  );

  const activePlayerOptions = useMemo(() => {
    const selectedSet = new Set(playerIds);
    return participantOptions.filter((option) => selectedSet.has(option.value));
  }, [participantOptions, playerIds]);

  useEffect(() => {
    if (!hostParticipantId || playerIds.length === 0) {
      return;
    }

    if (playerIds.includes(hostParticipantId)) {
      setValue(
        'playerIds',
        playerIds.filter((playerId) => playerId !== hostParticipantId),
        { shouldValidate: true },
      );
    }
  }, [hostParticipantId, playerIds, setValue]);

  useEffect(() => {
    const selectedSet = new Set(playerIds);

    getValues('items').forEach((item, itemIndex) => {
      item.guesses.forEach((guess, guessIndex) => {
        if (guess.playerId && !selectedSet.has(guess.playerId)) {
          setValue(`items.${itemIndex}.guesses.${guessIndex}.playerId`, 0, {
            shouldValidate: true,
          });
        }
      });
    });

    getValues('prizes').forEach((prize, prizeIndex) => {
      prize.beneficiaries.forEach((beneficiary, beneficiaryIndex) => {
        if (beneficiary.playerId && !selectedSet.has(beneficiary.playerId)) {
          setValue(
            `prizes.${prizeIndex}.beneficiaries.${beneficiaryIndex}.playerId`,
            0,
            {
              shouldValidate: true,
            },
          );
        }
      });
    });

    getValues('playerSponsors').forEach((entry, entryIndex) => {
      if (entry.playerId && !selectedSet.has(entry.playerId)) {
        setValue(`playerSponsors.${entryIndex}.playerId`, 0, {
          shouldValidate: true,
        });
      }
    });
  }, [getValues, playerIds, setValue]);

  const toggleGameSponsor = (sponsorId: number) => {
    const exists = selectedSponsorIds.includes(sponsorId);
    setValue(
      'gameSponsorIds',
      exists
        ? selectedSponsorIds.filter((id) => id !== sponsorId)
        : [...selectedSponsorIds, sponsorId],
      { shouldValidate: true },
    );
  };

  const onError = (errors: FieldErrors<GameFormData>) => {
    console.error('Validation errors:', errors);
    const errorMessages = Object.entries(errors)
      .map(([field, error]) => {
        if (error && typeof error === 'object' && 'message' in error) {
          return `${field}: ${(error as FieldError).message}`;
        }
        return field;
      })
      .join('\n');

    toast.error('Validation Failed', {
      description: errorMessages,
    });
  };

  const onSubmit = async (data: GameFormData) => {
    setServerError(null);

    const payload = {
      ...data,
      notes: data.notes?.trim() || undefined,
      prizes: data.includePrize ? data.prizes : [],
      gameSponsorIds: data.includeSponsors ? data.gameSponsorIds : [],
      playerSponsors: data.includeSponsors ? data.playerSponsors : [],
      items: data.items.map((item, index) => ({
        gameItemTypeId: item.gameItemTypeId,
        fallbackAnswer: item.fallbackAnswer,
        clues: item.clues.map((clue) => ({
          clue: clue.clue,
          isCompleted: !clue.isNotCompleted,
        })),
        guesses: item.guesses
          .filter((guess) => guess.playerId > 0)
          .map((guess) => ({
            playerId: guess.playerId,
            guess: guess.guess,
            clueHeard: guess.clueHeard,
            isCorrect: !guess.isIncorrect,
            clueNumber: guess.clueNumber,
          })),
        itemNumber: index + 1,
      })),
      jackpot: data.includeJackpot
        ? data.jackpot
        : {
            oneCorrect: 0,
            bothCorrect: 0,
            callerName: '',
            callerGuessInitialsCombination: '',
          },
    };

    console.log('Submitting game data:', payload);
    console.log('Game Data:', JSON.stringify(payload));

    try {
      const result = await addGame(payload);

      if (!result.success) {
        setServerError(result.error ?? 'Something went wrong');
        return;
      }

      toast.success('Game saved successfully!');
      reset(createDefaultValues());
      router.refresh();
    } catch {
      setServerError('Network error. Please try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Game</CardTitle>
        <CardDescription>
          Enter all available data for one game record.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit, onError)}>
          <section className="space-y-4">
            <h2 className="text-base font-semibold">Core Game Data</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <label htmlFor="gameNumber" className="text-sm font-medium">
                  Game Number
                </label>
                <Input
                  id="gameNumber"
                  type="number"
                  min={1}
                  {...register('gameNumber', { valueAsNumber: true })}
                />
                {errors.gameNumber && (
                  <p className="text-xs text-destructive">
                    {errors.gameNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="gameDate" className="text-sm font-medium">
                  Game Date
                </label>
                <Input id="gameDate" type="date" {...register('gameDate')} />
                {errors.gameDate && (
                  <p className="text-xs text-destructive">
                    {errors.gameDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Host</label>
                <Controller
                  control={control}
                  name="hostParticipantId"
                  render={({ field }) => (
                    <SearchableCombobox
                      value={field.value}
                      onChange={field.onChange}
                      options={participantOptions}
                      placeholder="Select host"
                    />
                  )}
                />
                {errors.hostParticipantId && (
                  <p className="text-xs text-destructive">
                    {errors.hostParticipantId.message}
                  </p>
                )}
              </div>

              <div className="space-y-1 md:col-span-2 lg:col-span-1">
                <label
                  htmlFor="initialsCombination"
                  className="text-sm font-medium"
                >
                  Initials Combination
                </label>
                <Input
                  id="initialsCombination"
                  placeholder="DD, BH, etc."
                  {...register('initialsCombination', {
                    onChange: (e) => {
                      e.target.value = e.target.value.toUpperCase();
                    },
                  })}
                />
                {errors.initialsCombination && (
                  <p className="text-xs text-destructive">
                    {errors.initialsCombination.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="locationId" className="text-sm font-medium">
                  Location
                </label>
                <select
                  id="locationId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  {...register('locationId', { valueAsNumber: true })}
                >
                  <option value={0}>Select location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                {errors.locationId && (
                  <p className="text-xs text-destructive">
                    {errors.locationId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Game Types</p>
              <Controller
                control={control}
                name="gameTypeIds"
                render={({ field }) => (
                  <SearchableMultiCombobox
                    values={field.value}
                    valueType="game type"
                    onChange={field.onChange}
                    options={gameTypes.map((gt) => ({
                      value: gt.id,
                      label: gt.type,
                    }))}
                    placeholder="Select game type(s)"
                  />
                )}
              />
              {errors.gameTypeIds && (
                <p className="text-xs text-destructive">
                  {errors.gameTypeIds.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Players In This Game</p>
              <Controller
                control={control}
                name="playerIds"
                render={({ field }) => (
                  <SearchableMultiCombobox
                    values={field.value}
                    valueType="player"
                    onChange={field.onChange}
                    options={playerPoolOptions}
                    placeholder="Select active players"
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Host is excluded from this list.
              </p>
              {errors.playerIds && (
                <p className="text-xs text-destructive">
                  {errors.playerIds.message}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-lg border p-4">
            <label className="flex items-center gap-2 font-medium">
              <Switch
                checked={includeSponsors}
                onCheckedChange={(next) => {
                  setValue('includeSponsors', next, { shouldValidate: true });

                  if (next && playerSponsorArray.fields.length === 0) {
                    playerSponsorArray.append({ playerId: 0, sponsorId: 0 });
                  } else if (!next) {
                    playerSponsorArray.remove();
                  }
                }}
              />
              Include Sponsor Data
            </label>

            {includeSponsors && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Game Sponsors</p>
                  <div className="flex flex-wrap gap-3 rounded-md border p-3">
                    {sponsors.map((sponsor) => (
                      <label
                        key={sponsor.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={selectedSponsorIds.includes(sponsor.id)}
                          onChange={() => toggleGameSponsor(sponsor.id)}
                        />
                        {sponsor.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Player Sponsors</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        playerSponsorArray.append({ playerId: 0, sponsorId: 0 })
                      }
                    >
                      Add Player Sponsor
                    </Button>
                  </div>

                  {playerSponsorArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]"
                    >
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Player</label>
                        <Controller
                          control={control}
                          name={`playerSponsors.${index}.playerId`}
                          render={({ field }) => (
                            <SearchableCombobox
                              value={field.value}
                              onChange={field.onChange}
                              options={activePlayerOptions}
                              placeholder="Select player"
                            />
                          )}
                        />
                      </div>

                      <div className="space-y-1">
                        <label
                          className="text-sm font-medium"
                          htmlFor={`playerSponsors.${index}.sponsorId`}
                        >
                          Sponsor
                        </label>
                        <select
                          id={`playerSponsors.${index}.sponsorId`}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                          {...register(`playerSponsors.${index}.sponsorId`, {
                            valueAsNumber: true,
                          })}
                        >
                          <option value={0}>Select sponsor</option>
                          {sponsors.map((sponsor) => (
                            <option key={sponsor.id} value={sponsor.id}>
                              {sponsor.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 self-end"
                        aria-label={`Remove player sponsor ${index + 1}`}
                        tabIndex={-1}
                        disabled={playerSponsorArray.fields.length <= 1}
                        onClick={() => setPlayerSponsorToRemoveIndex(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}

                  <ConfirmDialog
                    open={playerSponsorToRemoveIndex !== null}
                    onOpenChange={(open) => {
                      if (!open) {
                        setPlayerSponsorToRemoveIndex(null);
                      }
                    }}
                    title="Remove this player sponsor?"
                    onConfirm={() => {
                      if (playerSponsorToRemoveIndex !== null) {
                        playerSponsorArray.remove(playerSponsorToRemoveIndex);
                        setPlayerSponsorToRemoveIndex(null);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-lg border p-4">
            <label className="flex items-center gap-2 font-medium">
              <Switch
                checked={includeJackpot}
                onCheckedChange={(next) => {
                  setValue('includeJackpot', next);
                  if (!next) {
                    setValue('jackpot', {
                      oneCorrect: 0,
                      bothCorrect: 0,
                      callerName: '',
                      callerGuessInitialsCombination: '',
                    });
                  }
                }}
              />
              Include Jackpot Data
            </label>

            {includeJackpot && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label
                    className="text-sm font-medium"
                    htmlFor="jackpot.oneCorrect"
                  >
                    One Correct
                  </label>
                  <Input
                    id="jackpot.oneCorrect"
                    type="number"
                    min={0}
                    {...register('jackpot.oneCorrect', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-1">
                  <label
                    className="text-sm font-medium"
                    htmlFor="jackpot.bothCorrect"
                  >
                    Both Correct
                  </label>
                  <Input
                    id="jackpot.bothCorrect"
                    type="number"
                    min={0}
                    {...register('jackpot.bothCorrect', {
                      valueAsNumber: true,
                    })}
                  />
                </div>

                <div className="space-y-1">
                  <label
                    className="text-sm font-medium"
                    htmlFor="jackpot.callerName"
                  >
                    Caller Name (optional)
                  </label>
                  <Input
                    id="jackpot.callerName"
                    {...register('jackpot.callerName')}
                  />
                </div>

                <div className="space-y-1">
                  <label
                    className="text-sm font-medium"
                    htmlFor="jackpot.callerGuessInitialsCombination"
                  >
                    Caller Guess Initials (optional)
                  </label>
                  <Input
                    id="jackpot.callerGuessInitialsCombination"
                    {...register('jackpot.callerGuessInitialsCombination')}
                  />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold">Game Items</h2>
              <span
                className={
                  itemArray.fields.length >= minItems
                    ? 'text-xs text-green-600'
                    : 'text-xs text-muted-foreground'
                }
              >
                {itemArray.fields.length} / {minItems} required
              </span>
            </div>

            <div className="space-y-4">
              {itemArray.fields.map((itemField, itemIndex) => (
                <GameItemFields
                  key={itemField.id}
                  itemIndex={itemIndex}
                  canRemove={itemArray.fields.length > 1}
                  removeItem={() => itemArray.remove(itemIndex)}
                  playerOptions={activePlayerOptions}
                  gameItemTypes={gameItemTypes}
                  control={control}
                  register={register}
                  setValue={setValue}
                  errors={errors}
                />
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() =>
                  itemArray.append({
                    gameItemTypeId: 1,
                    fallbackAnswer: '',
                    clues: [{ clue: '', isNotCompleted: false }],
                    guesses: [{ playerId: 0, guess: '', clueHeard: '', isIncorrect: false }],
                  })
                }
              >
                Add Item
              </Button>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-base font-semibold">Additional Game Info</h2>
            <div className="space-y-1">
              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <label htmlFor="notes" className="text-sm font-medium">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  {...register('notes')}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border p-4">
            <label className="flex items-center gap-2 font-medium">
              <Switch
                checked={includePrize}
                onCheckedChange={(next) => {
                  setValue('includePrize', next, { shouldValidate: true });

                  if (next && prizeArray.fields.length === 0) {
                    prizeArray.append({
                      prize: '',
                      beneficiaries: [
                        { playerId: 0, pickOrder: 1, beneficiaryName: '' },
                      ],
                    });
                  } else if (!next) {
                    prizeArray.remove();
                  }
                }}
              />
              Include Prize Data
            </label>

            {includePrize && (
              <div className="space-y-4">
                {prizeArray.fields.map((prizeField, prizeIndex) => (
                  <PrizeFields
                    key={prizeField.id}
                    prizeIndex={prizeIndex}
                    canRemove={prizeArray.fields.length > 1}
                    removePrize={() => prizeArray.remove(prizeIndex)}
                    playerOptions={activePlayerOptions}
                    control={control}
                    register={register}
                    errors={errors}
                  />
                ))}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      prizeArray.append({ prize: '', beneficiaries: [] })
                    }
                  >
                    Add Prize
                  </Button>
                </div>
              </div>
            )}
          </section>

          {serverError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving Game…' : 'Save Game'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
