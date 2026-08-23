import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthedUser } from "../common/jwt-auth.guard";

/**
 * Route parameter decorator that exposes the authenticated user:
 *   me(@CurrentUser() user: AuthedUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedUser => ctx.switchToHttp().getRequest().user,
);
