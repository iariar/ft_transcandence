import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.use(bodyParser.json({ limit: '3mb' }));
  app.use(bodyParser.urlencoded({ limit: '3mb', extended: true }));
  app.enableCors({ credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      //For the class validator
      whitelist: true, //filters out the elements that are not in our dto
    }),
  );
  await app.listen(3000);
}

bootstrap();
