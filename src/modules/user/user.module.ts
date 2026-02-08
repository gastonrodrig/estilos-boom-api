import { Module } from '@nestjs/common';
import { ClientService } from './services';
import { ClientController } from './controllers';
import { BullModule } from '@nestjs/bullmq';
import { AuthService } from '../firebase/services';

@Module({
    imports: [
    BullModule.registerQueue(
      { name: 'forgot-password' },
    ),
  ],
  controllers: [ClientController],
  providers: [ClientService, AuthService],
})
export class UserModule {}