import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateProductionStatusDto {
  @ApiProperty({ description: 'Nuevo estado de la orden de producción' })
  @IsEnum(['CONTACTO_INICIAL', 'EN_PRODUCCION', 'CONTROL_CALIDAD', 'COMPLETADA', 'RECHAZADA'])
  @IsNotEmpty()
  status: string;
}
