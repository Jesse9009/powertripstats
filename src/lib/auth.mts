import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, username } from 'better-auth/plugins';
import { assertDb } from '@/db/client.mts';
import * as schema from '@/db/schema.mts';

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(assertDb(), {
      provider: 'sqlite',
      schema,
    }),
    emailAndPassword: { enabled: true },
    plugins: [admin(), username()],
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    ],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let _auth: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  if (!_auth) {
    _auth = createAuth();
  }
  return _auth;
}
