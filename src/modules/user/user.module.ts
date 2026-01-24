import { Module } from '@nestjs/common';
import { ClientService } from './services';
import { ClientController } from './controllers';

@Module({
  controllers: [ClientController],
  providers: [ClientService],
})
export class UserModule {}