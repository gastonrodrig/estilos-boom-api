import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
// import { BullModule } from '@nestjs/bullmq';  // deshabilitado temporalmente
import { ClientService } from './services/client.service';
import { WorkerService } from './services/worker.service';
import { UserManagementService } from './services/user-management.service';
import { ClientController } from './controllers/client.controller';
import { WorkerController } from './controllers/worker.controller';
import { UserController } from './controllers/user.controller';
import { User, UserSchema } from './schemas/user.schema';

import { Client, ClientSchema } from './schemas/client.schema';
import { Worker, WorkerSchema } from './schemas/worker.schema';
import { ClientCompany, ClientCompanySchema } from './schemas/client-company.schema';
import { ClientAddress, ClientAddressSchema } from './schemas/client-address.schema';
import { FirebaseModule } from '../firebase/firebase.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },

      { name: Client.name, schema: ClientSchema },
      { name: Worker.name, schema: WorkerSchema },
      { name: ClientCompany.name, schema: ClientCompanySchema },
      { name: ClientAddress.name, schema: ClientAddressSchema },
    ]),
    FirebaseModule,
    CartModule,
  ],
  controllers: [ClientController, WorkerController, UserController],
  providers: [ClientService, WorkerService, UserManagementService],
  exports: [ClientService, WorkerService, UserManagementService, MongooseModule],
})
export class UserModule { }