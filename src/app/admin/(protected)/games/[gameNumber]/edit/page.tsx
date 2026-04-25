import { notFound } from 'next/navigation';

import { AddGameForm } from '@/components/AddGameForm';
import { getGameByGameNumber, getGameFormOptions } from '@/app/actions';
import { gameToFormValues } from '@/lib/gameToFormValues';

interface PageProps {
  params: Promise<{ gameNumber: string }>;
}

export default async function EditGamePage({ params }: PageProps) {
  const { gameNumber } = await params;
  const parsedGameNumber = parseInt(gameNumber, 10);

  if (isNaN(parsedGameNumber) || parsedGameNumber <= 0) {
    notFound();
  }

  const [game, options] = await Promise.all([
    getGameByGameNumber(parsedGameNumber),
    getGameFormOptions(),
  ]);

  if (!game) {
    notFound();
  }

  const defaultValues = gameToFormValues(game);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Edit Game #{game.gameNumber}</h1>

      <AddGameForm
        participants={options.participants}
        gameTypes={options.gameTypes}
        gameItemTypes={options.gameItemTypes}
        sponsors={options.sponsors}
        locations={options.locations}
        mode="edit"
        gameId={game.id}
        defaultValues={defaultValues}
      />
    </main>
  );
}
