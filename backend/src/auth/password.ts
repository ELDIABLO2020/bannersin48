import * as bcrypt from "bcryptjs";

export const BCRYPT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

let dummyHash: Promise<string> | undefined;

/**
 * Compares against the stored hash, or against a throwaway hash when there is
 * no user, so a missing account costs the same bcrypt time as a wrong password.
 */
export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (hash) return bcrypt.compare(plain, hash);
  dummyHash ??= bcrypt.hash("timing-equaliser-not-a-real-credential", BCRYPT_ROUNDS);
  await bcrypt.compare(plain, await dummyHash);
  return false;
}
