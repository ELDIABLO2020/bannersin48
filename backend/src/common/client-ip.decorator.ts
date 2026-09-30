import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

/**
 * The client IP as Express resolves it. main.ts sets `trust proxy` to 1, so
 * this is the address Caddy saw; client-sent X-Forwarded-For hops are ignored.
 */
export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => ctx.switchToHttp().getRequest<Request>().ip,
);
