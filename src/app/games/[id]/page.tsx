import { notFound } from 'next/navigation';
import { getGameById } from '@/app/actions';
import { GameHeader } from '@/components/GameDataPage/GameHeader';
import { ItemsGrid } from '@/components/GameDataPage/ItemsGrid';
import { FinalStandings } from '@/components/GameDataPage/FinalStandings';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GamePage({ params }: PageProps) {
  const { id } = await params;
  const gameId = parseInt(id, 10);

  if (isNaN(gameId)) {
    notFound();
  }

  const game = await getGameById(gameId);

  if (!game) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6 md:p-10">
      <GameHeader
        gameNumber={game.gameNumber}
        gameDate={game.gameDate}
        hostFirstName={game.hostFirstName}
        hostLastName={game.hostLastName}
        hostNickname={game.hostNickname}
        initialsCombination={game.initialsCombination}
        locationName={game.locationName ?? null}
        gameSponsors={game.gameSponsors}
        players={game.players}
        jackpot={game.jackpot}
        prizes={game.prizes}
        notes={game.notes}
        items={game.items}
      />

      <FinalStandings items={game.items} players={game.players} />

      {game.items.length > 0 && (
        <ItemsGrid items={game.items} players={game.players} />
      )}
    </main>
  );
}
