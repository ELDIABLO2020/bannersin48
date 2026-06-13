/**
 * MSW Node setup for Vitest tests. Use `server.listen()` in setup files.
 */
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
