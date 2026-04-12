import {
  Controller, Get, Post, Body, Patch, Param, Query, Delete,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ProductService } from '../services';
import { CreateProductDto } from '../dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import { FilesInterceptor } from '@nestjs/platform-express';

@ApiTags('Products')
@ApiBearerAuth('firebase-auth')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @ApiOperation({ summary: 'Crear un producto con detalles técnicos e imágenes' })
  @Public()
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Vestido Gala' },
        description: { type: 'string', example: 'Vestido largo elegante' },
        sku: { type: 'string', example: 'VEST-GALA-01' },
        base_price: { type: 'number', example: 120.50 },
        id_category: { type: 'string', example: 'id-de-mongo' },
        // --- NUEVOS CAMPOS EN SWAGGER ---
        gender: { type: 'string', enum: ['MUJER', 'HOMBRE', 'UNISEX'], example: 'MUJER' },
        style_type: { type: 'string', example: 'CASUAL PREMIUM' },
        composition: { type: 'string', example: '95% ALGODÓN, 5% ELASTANO' },
        season: { type: 'string', example: 'PRIMAVERA 2026' },
        highlights: { 
          type: 'string', 
          description: 'Array en JSON: ["Tejido suave", "Corte entallado"]' 
        },
        custom_size_guide_url: { type: 'string', description: 'URL de imagen si es guía especial' },
        // -------------------------------
        is_best_seller: { type: 'boolean', example: false },
        is_new_in: { type: 'boolean', example: true },
        variants: {
          type: 'string',
          description: 'JSON de variantes: [{"size":"S","color":"Negro","stock":10,"sku_variant":"V1"}]'
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['name', 'sku', 'base_price', 'id_category', 'gender', 'files'],
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

    const parseJsonField = (field: any) => {
  if (!field || typeof field !== 'string') return field;
  
  // Si parece un JSON (empieza con [ o {), intentamos parsearlo
  if (field.startsWith('[') || field.startsWith('{')) {
    try {
      return JSON.parse(field);
    } catch (e) {
      return [field]; 
    }
  }
  
  // Si NO es JSON pero tiene comas, lo convertimos en array por comas
  if (field.includes(',')) {
    return field.split(',').map(item => item.trim());
  }

  // Si es solo un texto normal, lo metemos en un array
  return [field];
};

    // TRANSFORMACIÓN MANUAL (Por ser multipart/form-data)
    const createProductDto: CreateProductDto = {
      ...body,
      base_price: Number(body.base_price),
      is_best_seller: body.is_best_seller === 'true' || body.is_best_seller === true,
      is_new_in: body.is_new_in === 'true' || body.is_new_in === true,
      // Parsear JSONs que vienen como strings
      variants: parseJsonField(body.variants),
      highlights: parseJsonField(body.highlights), 
  technical_details: parseJsonField(body.technical_details),
    };

    return this.productService.create(createProductDto, files);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los productos con filtros avanzados' })
  @Public()
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'gender', required: false, enum: ['MUJER', 'HOMBRE', 'UNISEX'] }) // 👈 Nuevo
  @ApiQuery({ name: 'season', required: false }) // 👈 Nuevo
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(@Query() query: any) {
    return this.productService.findAll(query);
  }

  @ApiOperation({ summary: 'Actualizar producto, imágenes y variantes (Borrón y cuenta nueva)' })
  @ApiConsumes('multipart/form-data') // IMPORTANTE
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        // Define solo los campos que quieres permitir actualizar visualmente en Swagger
        name: { type: 'string', example: 'Nuevo Nombre del Vestido' },
        sku: { type: 'string', example: 'NUEVO-SKU-001' },
        base_price: { type: 'number', example: 145.99 },
        id_category: { type: 'string', example: 'uuid-valido-de-categoria' },
        is_best_seller: { type: 'boolean' },
        is_new_in: { type: 'boolean' },

        // Campo variantes como STRING JSON
        variants: {
          type: 'string',
          description: 'Pega el JSON completo de las nuevas variantes'
        },

        // Campo para subir archivos nuevos
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
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
    @Body() body: any // Usamos any para procesar los strings que envía Swagger
  ) {
    // 2. Aquí debe estar la lógica de transformación que vimos antes
    // Si no transformas, base_price llegará como "145.99" (string) y Prisma lo ignorará.
    const updateDto = {
      ...body,
      base_price: body.base_price ? Number(body.base_price) : undefined,
      is_best_seller: body.is_best_seller === 'true',
      is_new_in: body.is_new_in === 'true',
      variants: body.variants ? JSON.parse(body.variants) : undefined,
    };

    return this.productService.update(id, updateDto, files);
  }

  

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id/stock/:stock')
  @ApiOperation({ summary: 'Update product stock' })
  updateStock(
    @Param('idVariant') idVariant: string,
    @Body('stock') stock: number,
  ) {
    return this.productService.updateVariantStock(idVariant, Number(stock));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.deactivate(id);
  }
}