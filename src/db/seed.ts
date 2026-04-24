import { eq } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { assertDb } from "./client";
import { user } from "./schema";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local");
  process.exit(1);
}

const db = assertDb();

const existing = await db
  .select({ id: user.id })
  .from(user)
  .where(eq(user.email, email))
  .get();

if (existing) {
  console.log(`Admin user already exists (id: ${existing.id}), skipping creation.`);
} else {
  const result = await getAuth().api.signUpEmail({
    body: { email, password, name: "Admin" },
  });

  if (!result?.user?.id) {
    console.error("Failed to create admin user:", result);
    process.exit(1);
  }

  await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.id, result.user.id));

  console.log(`Admin user created (id: ${result.user.id})`);
}
