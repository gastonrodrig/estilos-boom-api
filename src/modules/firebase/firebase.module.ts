import { Module } from '@nestjs/common';
import { StorageService, AuthService } from './services';
import { AuthController } from './controllers';

@Module({
  providers: [StorageService, AuthService],
  exports: [StorageService, AuthService],
  controllers: [AuthController]
})
export class FirebaseModule {}