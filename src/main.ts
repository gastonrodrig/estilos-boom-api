import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from './config';
import * as admin from 'firebase-admin';

import { AppModule } from './app.module';
import {
  APP_NAME,
  API_PREFIX,
  API_VERSION,
  APP_DESCRIPTION,
} from './core/constants/app.constants';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  /**
   * Firebase Admin initialization
   */
  if (!admin.apps.length) {
    const firebaseCredentialsBase64 = envs.FIREBASE_CREDENTIALS_PATH;

    if (!firebaseCredentialsBase64) {
      logger.warn('FIREBASE_CREDENTIALS_PATH not found. Firebase not initialized.');
    } else {
      const serviceAccount = JSON.parse(
        Buffer.from(firebaseCredentialsBase64, 'base64').toString('utf8'),
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: envs.FIREBASE_STORAGE_BUCKET,
      });

      logger.log('Firebase Admin initialized');
    }
  }

  /**
   * Create NestJS application
   */
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  /**
   * Reflector
   */
  app.get(Reflector);

  /**
   * Global prefix
   */
  app.setGlobalPrefix(API_PREFIX);

  /**
   * Global validation pipe
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * CORS configuration
   */
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://estilos-boom-web.vercel.app'
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true,
  });

  /**
   * Swagger configuration
   */
  const swaggerConfig = new DocumentBuilder()
    .setTitle(APP_NAME)
    .setDescription(APP_DESCRIPTION)
    .setVersion(API_VERSION)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'firebase-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  /**
   * Start server
   */
  const port = Number(envs.PORT) || 3001;
  await app.listen(port, '0.0.0.0');

  logger.log(`App running on port ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api`);

  // main.ts
  console.log('Deploy desde GitHub Actions');
}

bootstrap();
