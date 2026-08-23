import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Queue, Worker } from "bullmq";
import { AppModule } from "./app.module";

/**
 * Worker entrypoint — same image as the API, different process.
 * Consumes BullMQ queues backed by Redis. In Phase 0 there is only a `ping`
 * queue proving the wiring; real jobs (email dispatch, artwork validation,
 * tracking polls) land in later phases per docs/backend-scope.md §6.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger("Worker");

  // Boot the Nest app context so the worker shares the same config/env handling.
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(ConfigService);

  // Plain connection options avoid pulling an ioredis client directly
  // (BullMQ bundles its own compatible version).
  const parsed = new URL(config.get<string>("REDIS_URL") ?? "redis://localhost:6379");
  const connection = {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    maxRetriesPerRequest: null,
  };

  const queue = new Queue("ping", { connection });
  // One-off job at startup proves the loop end-to-end…
  await queue.add("bootstrap-check", { startedAt: new Date().toISOString() });
  // …then keep a heartbeat running every minute.
  await queue.add(
    "heartbeat",
    { startedAt: new Date().toISOString() },
    { repeat: { every: 60 * 1000 }, removeOnComplete: 10 },
  );

  new Worker(
    "ping",
    async (job) => {
      logger.log(`Processed job ${job.name} #${job.id} — pong`);
    },
    { connection },
  );

  logger.log("Worker running — consuming BullMQ queues");
}

void bootstrap();
