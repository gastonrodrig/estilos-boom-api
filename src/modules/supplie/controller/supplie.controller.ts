import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Param, 
  Body, 
  HttpCode, 
  HttpStatus, 
  ParseBoolPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { SupplyService } from '../service/supplie.service';
import { CreateSupplyDto, UpdateSupplyDto } from '../dto';
import { Public } from 'src/auth/decorators'; // Remueve o ajusta según tu flujo de sesión

@ApiTags('Catálogo de Insumos (Supplies)')
@Controller('supplies')
export class SupplyController {
  constructor(private readonly supplyService: SupplyService) {}

  @ApiOperation({ 
    summary: 'Listar catálogo de insumos', 
    description: 'Devuelve todos los insumos calculando dinámicamente cuántos productos activos lo utilizan en su ficha técnica.' 
  })
  @Public() // Decorador público para pruebas en desarrollo, puedes usar tus roles de Firebase aquí
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return await this.supplyService.findAll();
  }

  @ApiOperation({ summary: 'Obtener detalle de un insumo por ID' })
  @ApiParam({ name: 'id', description: 'ID único del insumo en MongoDB' })
  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return await this.supplyService.findOne(id);
  }

  @ApiOperation({ summary: 'Registrar un nuevo insumo' })
  @ApiResponse({ status: 201, description: 'Insumo creado con éxito.' })
  @ApiResponse({ status: 400, description: 'El nombre del insumo ya existe o datos inválidos.' })
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSupplyDto) {
    return await this.supplyService.create(dto);
  }

  @ApiOperation({ summary: 'Actualizar propiedades de un insumo' })
  @ApiParam({ name: 'id', description: 'ID del insumo a modificar' })
  @Public()
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string, 
    @Body() dto: UpdateSupplyDto
  ) {
    return await this.supplyService.update(id, dto);
  }

  @ApiOperation({ 
    summary: 'Suspender o Reactivar un insumo (Cambio de estado masivo o individual)' 
  })
  @ApiParam({ name: 'id', description: 'ID del insumo' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        is_active: { type: 'boolean', example: false, description: 'false para suspender, true para reactivar' }
      },
      required: ['is_active']
    }
  })
  @Public()
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async toggleStatus(
    @Param('id') id: string,
    @Body('is_active', ParseBoolPipe) isActive: boolean
  ) {
    return await this.supplyService.toggleStatus(id, isActive);
  }
}