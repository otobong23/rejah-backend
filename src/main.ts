import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { config } from 'dotenv';
config()

const port = process.env.PORT || 4000 


async function bootstrap() {
  const app = await NestFactory.create(AppModule); 

  app.enableCors({
    origin: ['http://localhost:3000', 'https://rejah.net', 'https://www.rejah.net'], // allow requests from your frontend
    credentials: true,               // allow cookies/auth headers if needed
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips properties not in the DTO
      forbidNonWhitelisted: true, // throws error if extra properties
      transform: true, // transforms plain JSON into class instances
    }),
  );
  
  await app.listen(port);
}
bootstrap();
