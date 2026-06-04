import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { InventoryService } from '../service';
import { Public } from 'src/auth/decorators';
import { CreateWarehouseDocumentDto } from 'src/modules/warehouse/dto/create-warehouse-document.dto';

@ApiTags('Inventory (Gestión de Almacenes e Inventario)')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ==========================================
  // 1. ALMACENES
  // ==========================================

  @ApiOperation({ summary: 'Inicializar almacenes por defecto (Seed)' })
  @Public()
  @Post('warehouses/seed')
  @HttpCode(HttpStatus.OK)
  seedWarehouses() {
    return this.inventoryService.seedWarehouses();
  }

  @ApiOperation({ summary: 'Listar todos los almacenes activos' })
  @Public()
  @Get('warehouses')
  findAllWarehouses() {
    return this.inventoryService.findAllWarehouses();
  }

  // ==========================================
  // 2. STOCK POR ALMACÉN
  // ==========================================

  @ApiOperation({ summary: 'Obtener stock de una variante distribuido por almacén' })
  @ApiParam({ name: 'variantId', description: 'ID de la variante de producto' })
  @Public()
  @Get('stock/:variantId')
  getStockByVariant(@Param('variantId') variantId: string) {
    return this.inventoryService.getStockByVariant(variantId);
  }

  @ApiOperation({ summary: 'Obtener stock de múltiples variantes distribuido por almacén en lote' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['variant_ids'],
      properties: {
        variant_ids: {
          type: 'array',
          items: { type: 'string' },
          example: ['65f1a2b3c4d5e6f7a8b9c0d1', '65f1a2b3c4d5e6f7a8b9c0d2']
        }
      }
    }
  })
  @Public()
  @Post('stock/batch')
  @HttpCode(HttpStatus.OK)
  getStockByMultipleVariants(@Body('variant_ids') variantIds: string[]) {
    if (!variantIds || !Array.isArray(variantIds)) {
      throw new BadRequestException('El cuerpo de la petición debe contener un arreglo variant_ids');
    }
    return this.inventoryService.getStockByMultipleVariants(variantIds);
  }

  // ==========================================
  // 3. KÁRDEX Y MOVIMIENTOS (solo lectura — los movimientos se crean al procesar documentos)
  // ==========================================

  @ApiOperation({ summary: 'Obtener historial de movimientos (Kárdex) de una variante' })
  @ApiParam({ name: 'variantId', description: 'ID de la variante' })
  @Public()
  @Get('kardex/:variantId')
  getKardex(@Param('variantId') variantId: string) {
    return this.inventoryService.getKardexByVariant(variantId);
  }

  @ApiOperation({ summary: 'Listar todos los movimientos de inventario' })
  @Public()
  @Get('movements')
  findAllMovements() {
    return this.inventoryService.findAllMovements();
  }

  // ==========================================
  // 4. DOCUMENTOS DE ALMACÉN
  //    FLUJO OBLIGATORIO:
  //    a) POST /documents  → crea el documento en estado PENDIENTE
  //    b) PATCH /documents/:id/process → almacenero da conformidad → impacta stock + kárdex
  // ==========================================

  @ApiOperation({
    summary: 'Crear documento de almacén en estado PENDIENTE (Compra, Venta, Transferencia, Ajuste)',
    description:
      'El documento es el disparador de cualquier movimiento de inventario. ' +
      'Debe crearse DESPUÉS de que el catálogo (Producto + Variante) ya existe.',
  })
  @Public()
  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  createDocument(@Body() dto: CreateWarehouseDocumentDto) {
    return this.inventoryService.createWarehouseDocument(dto);
  }

  @ApiOperation({
    summary: 'Procesar documento (almacenero da conformidad física)',
    description:
      'Acción atómica: actualiza physical_stock en WarehouseStock y registra líneas en InventoryMovements.',
  })
  @ApiParam({ name: 'id', description: 'ID del WarehouseDocument' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id_worker', 'items'],
      properties: {
        id_worker: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id_variant: { type: 'string' },
              quantity_received: { type: 'number' },
              incidence_note: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @Public()
  @Patch('documents/:id/process')
  @HttpCode(HttpStatus.OK)
  processDocument(
    @Param('id') id: string,
    @Body('id_worker') workerId: string,
    @Body('items') items: { id_variant: string; quantity_received: number; incidence_note?: string }[],
  ) {
    return this.inventoryService.processWarehouseDocument(id, workerId, items);
  }

  @ApiOperation({ summary: 'Subir archivos adjuntos de evidencia a un documento de almacén' })
  @Public()
  @Patch('documents/:id/attachments')
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadWarehouseDocAttachments(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    return this.inventoryService.addWarehouseDocAttachments(id, files);
  }

  @ApiOperation({ summary: 'Listar todos los documentos de almacén' })
  @Public()
  @Get('documents')
  findAllDocuments() {
    return this.inventoryService.findAllWarehouseDocuments();
  }
}
