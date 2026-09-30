/**
 * Resolves the seed's admin account. Outside production it falls back to a
 * well-known local login; in production it refuses to run without explicit,
 * strong credentials so a default password can never reach a real server.
 */
export const LOCAL_ADMIN_EMAIL = "admin@bannersin48.local";
export const LOCAL_ADMIN_PASSWORD = "ChangeMe123!";
export const MIN_PROD_ADMIN_PASSWORD = 16;

const WEAK = /change-?me|password|example|placeholder/i;

export function resolveSeedAdmin(env: Record<string, string | undefined>): { email: string; password: string } {
  const email = env.ADMIN_EMAIL?.trim();
  const password = env.ADMIN_PASSWORD;

  if (env.NODE_ENV === "production") {
    const problems: string[] = [];
    if (!email) problems.push("ADMIN_EMAIL is required");
    if (!password) problems.push("ADMIN_PASSWORD is required");
    else if (password.length < MIN_PROD_ADMIN_PASSWORD) {
      problems.push(`ADMIN_PASSWORD must be at least ${MIN_PROD_ADMIN_PASSWORD} characters`);
    } else if (password === LOCAL_ADMIN_PASSWORD || WEAK.test(password)) {
      problems.push("ADMIN_PASSWORD looks like a placeholder");
    }
    if (problems.length > 0) {
      throw new Error(`Refusing to seed in production: ${problems.join("; ")}.`);
    }
  }

  return {
    email: (email || LOCAL_ADMIN_EMAIL).toLowerCase(),
    password: password || LOCAL_ADMIN_PASSWORD,
  };
}
