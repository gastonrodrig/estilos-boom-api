import * as dotenv from 'dotenv';
dotenv.config();

import { IsNumber, IsOptional, IsString, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

class EnvConfig {
  @IsNumber()
  PORT: number;

  @IsString()
  APP_URL: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  FIREBASE_CREDENTIALS_PATH: string;

  @IsString()
  FIREBASE_STORAGE_BUCKET: string;

  @IsString()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  GOOGLE_CLIENT_SECRET: string;

  @IsString()
  GOOGLE_REFRESH_TOKEN: string;

  @IsString()
  GOOGLE_REDIRECT_URI: string;

  @IsString()
  GMAIL_USER: string;

  @IsOptional()
  @IsString()
  GMAIL_APP_PASSWORD: string;

  @IsString()
  REDIS_URL: string;
}

function validateConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(
    EnvConfig,
    {
      ...config,
      PORT: config.PORT ? Number(config.PORT) : undefined,
    },
    {
      enableImplicitConversion: true,
    },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Config validation error:\n${errors
        .map(err => JSON.stringify(err.constraints))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}

export const envConfig = validateConfig(process.env);

export const envs = {
  PORT: envConfig.PORT,
  APP_URL: envConfig.APP_URL,

  DATABASE_URL: envConfig.DATABASE_URL,

  FIREBASE_CREDENTIALS_PATH: envConfig.FIREBASE_CREDENTIALS_PATH,
  FIREBASE_STORAGE_BUCKET: envConfig.FIREBASE_STORAGE_BUCKET,

  GOOGLE_CLIENT_ID: envConfig.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: envConfig.GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN: envConfig.GOOGLE_REFRESH_TOKEN,
  GOOGLE_REDIRECT_URI: envConfig.GOOGLE_REDIRECT_URI,
  GMAIL_USER: envConfig.GMAIL_USER,
  GMAIL_APP_PASSWORD: envConfig.GMAIL_APP_PASSWORD,

  REDIS_URL: envConfig.REDIS_URL,
};
