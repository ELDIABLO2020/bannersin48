/**
 * Operator password reset, for use over SSH while there is no email transport.
 *
 *   npm run admin:reset-password -w backend -- someone@example.com       # dev (ts-node)
 *   node dist/src/cli/reset-password.js someone@example.com              # production container
 *
 * The email is the first positional argument (`--email <address>` also works).
 * The new password is read from:
 *   --password-stdin            the first line of stdin, when this flag is given
 *   NEW_PASSWORD env var        when set (for non-interactive use; it is visible in the process environment)
 *   an interactive prompt       otherwise: hidden input with confirmation, needs a TTY
 * It is never accepted as a command-line argument, which other users could see in `ps`.
 *
 * Sets the hash, revokes every refresh token and unused reset link, and writes an
 * audit_log row (actor "system:cli"). Access tokens already issued stay valid until
 * they expire (15 minutes).
 */
import { PrismaClient } from "@prisma/client";
import * as readline from "readline";
import { hashPassword } from "../auth/password";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;
export const CLI_ACTOR = "system:cli";

type CliPrisma = Pick<PrismaClient, "user" | "refreshToken" | "passwordReset" | "auditLog" | "$transaction">;

export interface ResetResult {
  userId: string;
  role: string;
  status: string;
  revokedSessions: number;
}

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  if (password.trim() !== password) return "Password must not start or end with whitespace.";
  return null;
}

export async function resetPassword(prisma: CliPrisma, emailInput: string, password: string): Promise<ResetResult> {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);

  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No account with email ${email}.`);

  const passwordHash = await hashPassword(password);
  const now = new Date();
  const [, revoked] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } }),
    prisma.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
    // audit_log.actorId references users, so the CLI actor is recorded in the diff.
    prisma.auditLog.create({
      data: {
        actorId: null,
        action: "user.cli_password_reset",
        entityType: "user",
        entityId: user.id,
        diff: { actor: CLI_ACTOR, passwordChanged: true, sessionsRevoked: true },
        ip: null,
      },
    }),
  ]);

  return { userId: user.id, role: user.role, status: user.status, revokedSessions: revoked.count };
}

export function parseArgs(argv: string[]): { email?: string; passwordStdin: boolean } {
  let email: string | undefined;
  let passwordStdin = false;
  const setEmail = (value: string | undefined) => {
    if (email !== undefined) throw new Error("Give exactly one email address.");
    email = value;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--email") setEmail(argv[++i]);
    else if (arg.startsWith("--email=")) setEmail(arg.slice("--email=".length));
    else if (arg === "--password-stdin") passwordStdin = true;
    else if (arg === "--password" || arg.startsWith("--password=")) {
      throw new Error("Passing the password as an argument exposes it in `ps`. Use the prompt, NEW_PASSWORD or --password-stdin.");
    } else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    else setEmail(arg);
  }
  return { email, passwordStdin };
}

async function readStdinLine(): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  for await (const line of rl) {
    rl.close();
    return line;
  }
  return "";
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const mutable = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WritableStream };
    // Echo only the prompt itself; readline redraws (e.g. on backspace) include the typed text.
    mutable._writeToOutput = (s: string) => {
      if (s.startsWith(question)) mutable.output.write(question);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function readPassword(passwordStdin: boolean): Promise<string> {
  if (passwordStdin) return readStdinLine();
  if (process.env.NEW_PASSWORD) return process.env.NEW_PASSWORD;
  if (!process.stdin.isTTY) {
    throw new Error("No password given. Run in a terminal to be prompted, or set NEW_PASSWORD.");
  }
  const first = await promptHidden("New password: ");
  const second = await promptHidden("Repeat new password: ");
  if (first !== second) throw new Error("Passwords do not match.");
  return first;
}

async function main(): Promise<void> {
  const { email, passwordStdin } = parseArgs(process.argv.slice(2));
  if (!email) throw new Error("Usage: reset-password <email> [--password-stdin]");
  const password = await readPassword(passwordStdin);

  const prisma = new PrismaClient();
  try {
    const result = await resetPassword(prisma, email, password);
    console.log(
      `Password updated for ${email.trim().toLowerCase()} (${result.role}, ${result.status}); ` +
        `${result.revokedSessions} refresh token(s) revoked.`,
    );
    if (result.status !== "ACTIVE") console.log("Note: the account is not ACTIVE, so it still cannot sign in.");
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
