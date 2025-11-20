import { eq } from "drizzle-orm";
import type { Db } from "@miro/db";
import { schema } from "@miro/db";

export interface UserProfile {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly username?: string | null;
  readonly displayUsername?: string | null;
  readonly twoFactorEnabled?: boolean | null;
  readonly onboardingComplete?: boolean | null;
}

export async function getUserProfile(params: {
  readonly db: Db;
  readonly userId: string;
}): Promise<UserProfile | null> {
  const rows = await params.db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, params.userId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  const profile: UserProfile = {
    id: row.id,
    email: row.email,
    name: row.name,
    username: row.username ?? null,
    displayUsername: row.displayUsername ?? null,
    twoFactorEnabled: row.twoFactorEnabled ?? null,
    onboardingComplete: row.onboardingComplete ?? null,
  };
  return profile;
}
