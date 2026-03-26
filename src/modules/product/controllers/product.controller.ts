import {
  Controller, Get, Post, Body, Patch, Param, Query, Delete,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ProductService } from '../services';
import { CreateProductDto } from '../dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import { FilesInterceptor } from '@nestjs/platform-express';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }
  @ApiOperation({ summary: 'Crear un producto con sus variantes e imágenes' })
  @Public()
  @Post()
  @ApiConsumes('multipart/form-data') // 1. Indica que recibimos archivos
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Vestido Gala' },
        description: { type: 'string', example: 'Vestido largo elegante' },
        sku: { type: 'string', example: 'VEST-GALA-01' },
        base_price: { type: 'number', example: 120.50 },
        id_category: { type: 'string', example: 'uuid-de-la-categoria' },
        is_best_seller: { type: 'boolean', example: false },
        is_new_in: { type: 'boolean', example: true },
        // Enviamos las variantes como un string JSON
        variants: {
          type: 'string',
          description: 'JSON de variantes: [{"size":"S","color":"Negro","stock":10,"sku_variant":"V1"}]'
        },
        // 2. Aquí es donde aparece el botón de "Elegir Archivo"
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['name', 'sku', 'base_price', 'id_category', 'files'],
    },
  })
  @UseInterceptors(FilesInterceptor('files', 5))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any // Usamos 'any' para procesar los strings del multipart
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Debes subir al menos una imagen para el producto.');
    }

    // 3. TRANSFORMACIÓN: Convertimos los strings a sus tipos reales
    const createProductDto: CreateProductDto = {
      ...body,
      base_price: Number(body.base_price),
      is_best_seller: body.is_best_seller === 'true' || body.is_best_seller === true,
      is_new_in: body.is_new_in === 'true' || body.is_new_in === true,
      // Parseamos las variantes si vienen como string
      variants: typeof body.variants === 'string' ? JSON.parse(body.variants) : body.variants,
    };

    return this.productService.create(createProductDto, files);
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

  @Get()
  @Public()
  async findAll(
    @Query('category') category?: string,
    @Query('section') section?: string,
    @Query('maxPrice') maxPrice?: string, // Llega como string desde la URL
    @Query('colors') colors?: string | string[], // Puede ser un color o varios
  ) {
    return this.productService.findAll({
      category,
      section,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      colors
    });
  }

  @Get(':id')
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