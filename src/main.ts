import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
// import { join } from 'path';
// import * as express from 'express';


async function bootstrap() {
  const app = await NestFactory.create(AppModule); app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips properties not in the DTO
      forbidNonWhitelisted: true, // throws error if extra properties
      transform: true, // transforms plain JSON into class instances
    }),
  );
  // app.use('/public', express.static(join(__dirname, '..', 'public')));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
