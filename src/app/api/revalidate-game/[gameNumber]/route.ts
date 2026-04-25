import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameNumber: string }> }
) {
  const { gameNumber } = await params;
  const parsedGameNumber = parseInt(gameNumber, 10);

  if (isNaN(parsedGameNumber)) {
    return NextResponse.json({ error: 'Invalid game number' }, { status: 400 });
  }

  revalidatePath('/games');
  revalidatePath(`/games/${parsedGameNumber}`);

  return NextResponse.json({ revalidated: true, gameNumber: parsedGameNumber });
}
