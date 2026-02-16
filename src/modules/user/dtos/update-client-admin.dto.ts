import { ApiProperty, PartialType } from "@nestjs/swagger";
import { CreateClientAdminDto } from './create-client-admin.dto';
import { Estado } from "src/core/constants/app.constants";
import { IsEnum, IsOptional } from "class-validator";

export class UpdateClientAdminDto extends PartialType(CreateClientAdminDto) {
  @ApiProperty({ enum: Estado, example: Estado.ACTIVO })
  @IsEnum(Estado)
  @IsOptional()
  status?: Estado;
}