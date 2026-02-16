import { PartialType } from '@nestjs/swagger';
import { CreateClientAdminDto } from './create-client-admin.dto';

export class UpdateExtraDataDto extends PartialType(CreateClientAdminDto) {}
