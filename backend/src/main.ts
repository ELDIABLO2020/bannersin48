import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { boundShutdown, configureApp, configureServerTimeouts } from "./bootstrap";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  configureServerTimeouts(app.getHttpServer());
  boundShutdown(app.getHttpServer());

  const port = app.get(ConfigService).get<number>("PORT") ?? 3001;
  await app.listen(port);
  new Logger("Bootstrap").log(`API listening on port ${port}`);
}

void bootstrap();
