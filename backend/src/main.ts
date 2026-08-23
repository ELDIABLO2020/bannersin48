import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global request validation — every incoming body goes through its DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not on the DTO
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const config = app.get(ConfigService);
  const port = config.get<number>("PORT") ?? 3001;

  // Sensible local-dev CORS: the Next.js frontend runs on :3000.
  app.enableCors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  });

  await app.listen(port);
  new Logger("Bootstrap").log(`API listening on http://localhost:${port}`);
}

void bootstrap();
