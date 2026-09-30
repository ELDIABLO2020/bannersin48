import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Opts a route (or a whole controller) out of the global JwtAuthGuard.
 * Every other route requires a valid access token.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
