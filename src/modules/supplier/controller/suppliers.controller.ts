import { Controller, Post, Get, Body, HttpCode, HttpStatus, Patch, Param, Delete, Query } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery, 
  ApiBody 
} from '@nestjs/swagger';
import { SuppliersService } from '../service/suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from '../dto';
import { Public } from 'src/auth/decorators';

@ApiTags('Proveedores (Suppliers)') // Título más descriptivo para la sección
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Registrar un nuevo proveedor',
    description: 'Crea un registro de proveedor en la base de datos para el abastecimiento de materia prima o servicios.'
  })
  @ApiResponse({ status: 201, description: 'El proveedor ha sido creado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta (Validación de datos fallida).' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Listar proveedores con filtros',
    description: 'Retorna una lista de proveedores. Permite filtrar por nombre/RUC o por su estado actual.'
  })
  @ApiQuery({ name: 'search', required: false, description: 'Término de búsqueda (Nombre o RUC)', type: String })
  @ApiQuery({ name: 'status', required: false, description: 'Estado del proveedor (true/false)', type: String })
  @ApiResponse({ status: 200, description: 'Lista de proveedores obtenida correctamente.' })
  findAll(@Query('search') search?: string, @Query('status') status?: string) {
    return this.suppliersService.findAll({ search, status });
  }

  @Get('ranking')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Obtener ranking de proveedores sugeridos',
    description: 'Algoritmo que devuelve los mejores proveedores basados en calidad, precio y tiempo de entrega.'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Cantidad de proveedores a mostrar (default: 5)', type: Number })
  @ApiResponse({ status: 200, description: 'Ranking generado exitosamente.' })
  getTopRanking(@Query('limit') limit: number) {
    return this.suppliersService.getRankingSugerido(limit || 5);
  }

  @Get(':id/ficha')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Obtener ficha detallada',
    description: 'Muestra la información completa del proveedor incluyendo su historial de órdenes y desempeño.'
  })
  @ApiParam({ name: 'id', description: 'ID único del proveedor en la base de datos (MongoDB ObjectID)' })
  @ApiResponse({ status: 200, description: 'Ficha detallada encontrada.' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado.' })
  getFicha(@Param('id') id: string) {
    return this.suppliersService.getFicha(id);
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener detalle de un proveedor por ID' })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({ status: 200, description: 'Datos del proveedor obtenidos.' })
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Actualizar información del proveedor',
    description: 'Permite modificar datos de contacto o condiciones comerciales de un proveedor existente.'
  })
  @ApiParam({ name: 'id', description: 'ID del proveedor a actualizar' })
  @ApiBody({ type: UpdateSupplierDto })
  @ApiResponse({ status: 200, description: 'Proveedor actualizado correctamente.' })
  @ApiResponse({ status: 404, description: 'No se encontró el proveedor para actualizar.' })
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Desactivar un proveedor',
    description: 'Realiza un borrado lógico (Soft Delete) cambiando el estado del proveedor a inactivo.'
  })
  @ApiParam({ name: 'id', description: 'ID del proveedor a desactivar' })
  @ApiResponse({ status: 200, description: 'Proveedor desactivado exitosamente.' })
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}