import { getAuth } from '@/lib/auth.mts';
import { toNextJsHandler } from 'better-auth/next-js';
import type { NextRequest } from 'next/server';

const handler = () => toNextJsHandler(getAuth());

export async function GET(req: NextRequest) {
  return handler().GET(req);
}

export async function POST(req: NextRequest) {
  return handler().POST(req);
}
