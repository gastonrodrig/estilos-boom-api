import mongoose from "mongoose";
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Supplier, SupplierSchema } from './schema/supplier.schema';
import { SuppliersService } from './service/suppliers.service';
import { SuppliersController } from "./controller/suppliers.controller";
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Supplier.name, schema: SupplierSchema }]),
    ],
    controllers: [SuppliersController],
    providers: [SuppliersService],
    exports: [SuppliersService]
})
export class SupplierModule {}