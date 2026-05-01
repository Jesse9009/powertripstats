import { eq, and } from 'drizzle-orm';
import { getAuth } from '../lib/auth.mjs';
import { assertDb } from './client.mjs';
import { participants } from './schema.mjs';

// const email = process.env.ADMIN_EMAIL;
// const password = process.env.ADMIN_PASSWORD;
// const adminUsername = process.env.ADMIN_USERNAME;

// if (!email || !password) {
//   console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
//   process.exit(1);
// }

// const db = assertDb();

// (async () => {
//   const existing = await db
//     .select({ id: user.id })
//     .from(user)
//     .where(eq(user.email, email))
//     .get();

//   if (existing) {
//     console.log(
//       `Admin user already exists (id: ${existing.id}), skipping creation.`,
//     );
//   } else {
//     const result = await getAuth().api.signUpEmail({
//       body: {
//         email,
//         password,
//         name: 'Admin',
//         ...(adminUsername ? { username: adminUsername } : {}),
//       },
//     });

//     if (!result?.user?.id) {
//       console.error('Failed to create admin user:', result);
//       process.exit(1);
//     }

//     await db
//       .update(user)
//       .set({ role: 'admin' })
//       .where(eq(user.id, result.user.id));

//     console.log(`Admin user created (id: ${result.user.id})`);
//   }
// })();

const db = assertDb();
// Seed participants from array
const seedParticipants = [];

(async () => {
  for (const name of seedParticipants) {
    const splitName = name.split(' ');
    const firstName = splitName[0];
    const lastName = splitName[1] || '';

    const existing = await db
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.firstName, firstName),
          eq(participants.lastName, lastName),
        ),
      )
      .get();

    if (existing) {
      console.log(
        `Participant "${firstName} ${lastName}" already exists (id: ${existing.id}), skipping creation.`,
      );
    } else {
      const result = await db
        .insert(participants)
        .values({ firstName, lastName })
        .returning({ id: participants.id })
        .get();

      console.log(
        `Participant "${firstName} ${lastName}" created (id: ${result.id})`,
      );
    }
  }
})();
