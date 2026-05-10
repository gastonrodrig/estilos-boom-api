import { Controller, Post, Get, Body, HttpCode, HttpStatus, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WorkshopService } from '../service/workshop.service';
import { CreateWorkshopDto, UpdateWorkshopDto } from '../dto';
import { Public } from 'src/auth/decorators';

@ApiTags('Workshops')
@Controller('workshops')
export class WorkshopController {
  constructor(private readonly workshopService: WorkshopService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un nuevo taller' })
  create(@Body() dto: CreateWorkshopDto) {
    return this.workshopService.create(dto);
  }

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar talleres activos o por filtros de búsqueda' })
  findAll(@Query('search') search?: string, @Query('status') status?: string) {
    return this.workshopService.findAll({ search, status });
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener detalle de un taller' })
  findOne(@Param('id') id: string) {
    return this.workshopService.findOne(id);
  }

  @Patch(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar información del taller' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkshopDto) {
    return this.workshopService.update(id, dto);
  }

  @Delete(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar un taller (Soft Delete)' })
  remove(@Param('id') id: string) {
    return this.workshopService.remove(id);
  }
}
