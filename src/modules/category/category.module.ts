import { Module } from '@nestjs/common';
import { CategoryService } from './service/category.service';
import { CategoryController } from './controller/category.controller';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}