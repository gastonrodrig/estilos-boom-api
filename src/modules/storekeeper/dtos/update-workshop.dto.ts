import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Estado } from "src/core/constants/app.constants";
import { IsEnum, IsOptional } from "class-validator";
import { CreateWorkshopDto } from "./create-workshop.dto";

export class UpdateWorkshopDto extends PartialType(CreateWorkshopDto) {
  @ApiProperty({ enum: Estado, example: Estado.ACTIVO })
  @IsEnum(Estado)
  @IsOptional()
  status?: Estado;
}