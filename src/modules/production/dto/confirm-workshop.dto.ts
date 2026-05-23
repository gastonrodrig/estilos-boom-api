import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class ConfirmWorkshopDto {
  @ApiProperty({ description: 'ID del taller ganador' })
  @IsMongoId()
  @IsNotEmpty()
  id_workshop: string;
}
