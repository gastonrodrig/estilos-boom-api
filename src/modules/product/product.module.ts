import { Module } from '@nestjs/common';
import { ProductService } from './services/product.service';
import { ProductController } from './controllers/product.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from '../firebase/services';

@Module({
  controllers: [ProductController],
  providers: [ProductService, StorageService, PrismaService],
})
export class ProductModule {}