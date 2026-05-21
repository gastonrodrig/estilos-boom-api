import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsOptional } from 'class-validator';

export class CreateSupplyDto {
  @ApiProperty({ example: 'Tela Viscosa Estampada', description: 'Nombre único del insumo o materia prima' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del insumo es obligatorio' })
  name: string;

  @ApiProperty({ 
    example: 'metros', 
    enum: ['metros', 'unidades', 'rollos', 'conos'], 
    description: 'Unidad de medida del inventario base' 
  })
  @IsEnum(['metros', 'unidades', 'rollos', 'conos'], { 
    message: 'La unidad debe ser: metros, unidades, rollos o conos' 
  })
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
    @IsNotEmpty()
    @IsEnum(['Telas', 'Hilos', 'Cierres y Cremalleras', 'Elásticos', 'Botones y Broches', 'Entretelas', 'Acabados', 'Otros'])
    category: string;

    @IsString()
    @IsOptional()
    notes?: string;
}