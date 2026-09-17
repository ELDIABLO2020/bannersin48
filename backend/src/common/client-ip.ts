import type { Request } from "express";

/** Client IP for audit trails — first X-Forwarded-For hop, else the socket address. */
export function ipOf(req: Request): string | undefined {
  return (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip;
}
