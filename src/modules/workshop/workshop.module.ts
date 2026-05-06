import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Workshop, WorkshopSchema } from './schema/workshop.schema';
import { WorkshopController } from './controller/workshop.controller';
import { WorkshopService } from './service/workshop.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Workshop.name, schema: WorkshopSchema }]),
  ],
  controllers: [WorkshopController],
  providers: [WorkshopService],
  exports: [WorkshopService],
})
export class WorkshopModule {}
