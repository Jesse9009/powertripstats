import { createClient } from "@libsql/client";

import { drizzle } from "drizzle-orm/libsql";

function getTursoEnv() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    return null;
  }

  return { authToken, url };
}

export function getDb() {
  const env = getTursoEnv();

  if (!env) {
    return null;
  }

  const client = createClient({
    authToken: env.authToken,
    url: env.url,
  });

  return drizzle(client);
}

export function assertDb() {
  const db = getDb();

  if (!db) {
    throw new Error(
      "Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN. Configure env vars before querying the database.",
    );
  }

  return db;
}
