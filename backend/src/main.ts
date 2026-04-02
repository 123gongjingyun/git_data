import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { runtimeConfig } from "./config/runtime";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins =
    runtimeConfig.corsOrigins.length > 0 ? runtimeConfig.corsOrigins : true;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  await app.listen(runtimeConfig.port, runtimeConfig.host);
}

bootstrap();
