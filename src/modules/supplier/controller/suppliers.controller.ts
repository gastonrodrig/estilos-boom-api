import { Controller, Post, Get, Body, HttpCode, HttpStatus, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SuppliersService } from '../service/suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from '../dto';
import { Public } from 'src/auth/decorators'; // Ajusta la ruta según tu proyecto

@ApiTags('Suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un nuevo proveedor' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar proveedores activos o por filtros de búsqueda' })
  findAll(@Query('search') search?: string, @Query('status') status?: string) {
    return this.suppliersService.findAll({ search, status });
  }

  @Get('ranking')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener top proveedores sugeridos por el algoritmo' })
  getTopRanking(@Query('limit') limit: number) {
    return this.suppliersService.getRankingSugerido(limit || 5);
  }

  @Get(':id/ficha')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener ficha detallada del proveedor con historial de órdenes' })
  getFicha(@Param('id') id: string) {
    return this.suppliersService.getFicha(id);
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener detalle de un proveedor' })
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar información del proveedor' })
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar un proveedor (Soft Delete)' })
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }

  
}