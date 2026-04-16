import { notFound } from 'next/navigation';
import { getGameById } from '@/app/actions';
import { OverviewSection } from '@/components/GameDataPage/OverviewSection';
import { PlayersSection } from '@/components/GameDataPage/PlayersSection';
import { PrizesSection } from '@/components/GameDataPage/PrizesSection';
import { ItemsTimeline } from '@/components/GameDataPage/ItemsTimeline';
import { JackpotSection } from '@/components/GameDataPage/JackpotSection';
import { SponsorsSection } from '@/components/GameDataPage/SponsorsSection';

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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 p-6 md:p-10">
      <OverviewSection
        gameNumber={game.gameNumber}
        gameDate={game.gameDate}
        hostFirstName={game.hostFirstName}
        hostLastName={game.hostLastName}
        hostNickname={game.hostNickname}
        initialsCombination={game.initialsCombination}
        notes={game.notes}
      />

      {game.players.length > 0 && (
        <PlayersSection players={game.players} />
      )}

      {game.prizes.length > 0 && (
        <PrizesSection prizes={game.prizes} />
      )}

      {game.items.length > 0 && (
        <ItemsTimeline items={game.items} />
      )}

      {game.jackpot && (
        <JackpotSection jackpot={game.jackpot} />
      )}

      {game.gameSponsors.length > 0 && (
        <SponsorsSection sponsors={game.gameSponsors} />
      )}
    </main>
  );
}
