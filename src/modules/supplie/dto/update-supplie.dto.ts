import { PartialType } from '@nestjs/swagger';
import { CreateSupplyDto } from './supplie.dto';

export class UpdateSupplyDto extends PartialType(CreateSupplyDto) {}