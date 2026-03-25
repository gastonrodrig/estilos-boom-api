import { Module } from '@nestjs/common';
import { ClientService } from './services';
import { ClientController } from './controllers';
import { BullModule } from '@nestjs/bullmq';
import { AuthService } from '../firebase/services';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'forgot-password' },
      { name: 'temporal-credentials' },
      { name: 'security-notifications' },
    ),
  ],
  controllers: [ClientController],
  providers: [ClientService, AuthService],
})
export class UserModule { }