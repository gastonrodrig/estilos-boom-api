import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FirebaseModule } from '../firebase/firebase.module';
import { WorkshopController } from './controllers';
import { WorkshopService } from './services';
import { Workshop, WorkshopSchema } from './schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workshop.name, schema: WorkshopSchema },
    ]),
    FirebaseModule,
  ],
  controllers: [WorkshopController],
  providers: [WorkshopService],
  exports: [WorkshopService, MongooseModule],
})
export class StorekeeperModule { }