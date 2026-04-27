// update-supplier.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplierDto } from './createSuppliers.dto';
export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}