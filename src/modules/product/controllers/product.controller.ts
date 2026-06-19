import {
  Controller, Get, Post, Body, Patch, Param, Query, Delete,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductService } from '../services';
import { CreateProductDto } from '../dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateVariantDto } from '../dto/create-variant.dto';

const parseJsonField = (field: any) => {
  if (!field || typeof field !== 'string') return field;
  if (field.startsWith('[') || field.startsWith('{')) {
    try {
      return JSON.parse(field);
    } catch (e) {
      return [field]; 
    }
  }
  if (field.includes(',')) {
    return field.split(',').map(item => item.trim());
  }
  return [field];
};

@ApiTags('Productos (Products)')
@ApiBearerAuth('firebase-auth')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @ApiOperation({ 
    summary: 'Crear un producto con detalles técnicos, variantes e imágenes',
    description: 'Permite registrar un producto gestionando sus variantes con color objeto (name/hex).' 
  })
  @Public()
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Vestido Gala Texturizado' },
        description: { type: 'string', example: 'Vestido largo elegante de seda' },
        sku: { type: 'string', example: 'VEST-GALA-100' },
        base_price: { type: 'number', example: 140.50 },
        id_category: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' },
        gender: { type: 'string', enum: ['MUJER', 'HOMBRE', 'UNISEX'], example: 'MUJER' },
        style_type: { type: 'string', example: 'CASUAL PREMIUM' },
        composition: { type: 'string', example: '95% ALGODÓN, 5% ELASTANO' },
        season: { type: 'string', example: 'PRIMAVERA 2026' },
        highlights: { 
          type: 'string', 
          description: 'Array en JSON: ["Tejido suave", "Corte entallado"]',
          example: '["Tejido suave", "Corte entallado"]'
        },
        custom_size_guide_url: { type: 'string', description: 'URL de imagen si es guía especial' },
        is_best_seller: { type: 'boolean', example: false },
        is_new_in: { type: 'boolean', example: true },
        
        // 🔄 NUEVO CAMPO EN SWAGGER UI: Tipo de Origen
        origin_type: { type: 'string', enum: ['RETAIL'], example: 'RETAIL' },
        
        // 🎨 ACTUALIZADO EN SWAGGER UI: Nuevo formato de variantes con color estructurado
        variants: {
          type: 'string',
          description: 'JSON String de variantes con objeto color {name, hex}',
          example: '[{"size":"M","color":{"name":"Rosa Barbie","hex":"#FF4FA3"},"stock":10,"sku_variant":"VEST-M-ROS"}]'
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['name', 'sku', 'base_price', 'id_category', 'gender', 'origin_type', 'variants', 'files'],
    },
  })
  @UseInterceptors(FilesInterceptor('files', 5))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any 
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Debes subir al menos una imagen.');
    }

    // TRANSFORMACIÓN MANUAL Y CONTROLADA DEL BODY MULTIPART
    const createProductDto: CreateProductDto = {
      ...body,
      base_price: Number(body.base_price),
      is_best_seller: body.is_best_seller === 'true' || body.is_best_seller === true,
      is_new_in: body.is_new_in === 'true' || body.is_new_in === true,
      is_discount: body.is_discount === 'true' || body.is_discount === true,
      variants: body.variants, 
      highlights: body.highlights ? parseJsonField(body.highlights) : [], 
      technical_details: body.technical_details ? parseJsonField(body.technical_details) : undefined,
      technical_sheet: body.technical_sheet ? parseJsonField(body.technical_sheet) : undefined,
    } as any;

    return this.productService.create(createProductDto, files);
  }

  @Get('next-sku')
  @Public()
  @ApiOperation({ summary: 'Obtener el siguiente SKU disponible para un prefijo dado' })
  @ApiQuery({ name: 'abbr',   required: true,  description: 'Abreviatura de la categoría (ej: VEST)' })
  @ApiQuery({ name: 'gender', required: true,  description: 'Género del producto (MUJER, HOMBRE, UNISEX)' })
  @ApiQuery({ name: 'season', required: true,  description: 'Temporada (ej: PRIMAVERA 2026)' })
  getNextSku(
    @Query('abbr')   abbr:   string,
    @Query('gender') gender: string,
    @Query('season') season: string,
  ) {
    return this.productService.getNextSkuSequence(abbr, gender, season);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los productos con filtros avanzados' })
  @Public()
  @ApiQuery({ name: 'category', required: false, description: 'Filtrar por nombre de categoría' })
  @ApiQuery({ name: 'gender', required: false, enum: ['MUJER', 'HOMBRE', 'UNISEX'] }) 
  @ApiQuery({ name: 'season', required: false, description: 'Filtrar por temporada de ropa' }) 
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Tope máximo de precio base' })
  @ApiQuery({ name: 'colors', required: false, description: 'Filtrar por nombre de color (ej: Negro)' })
  @ApiQuery({ name: 'origin_type', required: false, enum: ['RETAIL', 'PRODUCCION'], description: 'Filtrar por origen del producto' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(@Query() query: any) {
    return this.productService.findAll(query);
  }

  @ApiOperation({ summary: 'Actualizar producto, imágenes y variantes (Borrón y cuenta nueva)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Nuevo Nombre del Vestido' },
        sku: { type: 'string', example: 'NUEVO-SKU-001' },
        base_price: { type: 'number', example: 145.99 },
        id_category: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' },
        is_best_seller: { type: 'boolean' },
        is_new_in: { type: 'boolean' },
        origin_type: { type: 'string', enum: ['RETAIL'] },
        variants: {
          type: 'string',
          description: 'Pega el JSON completo de las nuevas variantes con el formato estructurado'
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @Patch(':id')
  @Public()
  @UseInterceptors(FilesInterceptor('files', 5))
  async update(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any 
  ) {
    const updateDto = {
      ...body,
      base_price: body.base_price ? Number(body.base_price) : undefined,
      is_active: body.is_active !== undefined ? (body.is_active === 'true' || body.is_active === true) : undefined,
      is_best_seller: body.is_best_seller !== undefined ? (body.is_best_seller === 'true' || body.is_best_seller === true) : undefined,
      is_new_in: body.is_new_in !== undefined ? (body.is_new_in === 'true' || body.is_new_in === true) : undefined,
      is_discount: body.is_discount !== undefined ? (body.is_discount === 'true' || body.is_discount === true) : undefined,
      variants: body.variants || undefined,
      technical_sheet: body.technical_sheet ? parseJsonField(body.technical_sheet) : undefined,
    };

    return this.productService.update(id, updateDto, files);
  }

  @Get(':id/metrics')
  @Public()
  @ApiOperation({ summary: 'Obtener métricas reales de ventas y favoritos por producto' })
  getMetrics(@Param('id') id: string) {
    return this.productService.getMetrics(id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener detalle de un producto y sus variantes por ID' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':idVariant/stock/:stock')
  @Public()
  @ApiOperation({ summary: 'Actualizar el stock físico disponible de una variante por su ID' })
  updateStock(
    @Param('idVariant') idVariant: string,
    @Param('stock') stock: number, 
  ) {
    return this.productService.updateVariantStock(idVariant, Number(stock));
  }

  @Delete(':id')
  @Public()
  @ApiOperation({ summary: 'Desactivar un producto de forma lógica (is_active: false)' })
  remove(@Param('id') id: string) {
    return this.productService.deactivate(id);
  }

  @Post('variants')
  @Public() 
  @ApiOperation({ summary: 'Crear una variante de producto de forma independiente' })
  async createVariant(@Body() dto: CreateVariantDto) {
    return this.productService.createVariant(dto);
  }

  @Patch(':idVariant/min-stock')
  @Public() 
  @ApiOperation({ summary: 'Actualizar el umbral de alerta de stock mínimo de una variante' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        min_stock_alert: { type: 'number', example: 15 }
      },
      required: ['min_stock_alert']
    }
  })
  async updateMinStock(
    @Param('idVariant') idVariant: string,
    @Body('min_stock_alert') minStock: number,
  ) {
    if (isNaN(minStock)) {
      throw new BadRequestException('El valor de min_stock_alert debe ser un número');
    }
    return this.productService.updateMinStockAlert(idVariant, Number(minStock));
  }
}