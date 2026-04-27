import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductionService } from '../services/production.service';
import { CreateRawMaterialDto, UpdateRawMaterialDto } from '../dto';

@ApiTags('Raw Materials')
@ApiBearerAuth('firebase-auth')
@Controller('production/raw-materials')
export class RawMaterialController {
    constructor(private readonly productionService: ProductionService) { }

    @Post()
    @ApiOperation({ summary: 'Crear nueva materia prima' })
    create(@Body() createRawMaterialDto: CreateRawMaterialDto) {
        return this.productionService.createRawMaterial(createRawMaterialDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas las materias primas' })
    findAll() {
        return this.productionService.findAllRawMaterials();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener detalle de una materia prima' })
    findOne(@Param('id') id: string) {
        return this.productionService.findOneRawMaterial(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar una materia prima' })
    update(@Param('id') id: string, @Body() updateRawMaterialDto: UpdateRawMaterialDto) {
        return this.productionService.updateRawMaterial(id, updateRawMaterialDto);
    }

    @Get(':id/movements')
    @ApiOperation({ summary: 'Obtener historial de movimientos de una materia prima' })
    findMovements(@Param('id') id: string) {
        return this.productionService.getMovementsByMaterial(id);
    }
}
