import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Param, 
  Body, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { InventoryService } from '../service';
import { Public } from 'src/auth/decorators';

@ApiTags('Inventory (Gestión de Almacenes e Inventario)')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ==========================================
  // 1. ENDPOINTS: ALMACENES Y STOCK
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
  @HttpCode(HttpStatus.OK)
  findAllWarehouses() {
    return this.inventoryService.findAllWarehouses();
  }

  @ApiOperation({ summary: 'Obtener el stock de una variante distribuido por almacén' })
  @ApiParam({ name: 'variantId', description: 'ID de la variante de producto' })
  @Public()
  @Get('stock/:variantId')
  @HttpCode(HttpStatus.OK)
  getStockByVariant(@Param('variantId') variantId: string) {
    return this.inventoryService.getStockByVariant(variantId);
  }

  // ==========================================
  // 2. ENDPOINTS: KARDEX Y MOVIMIENTOS
  // ==========================================

  @ApiOperation({ summary: 'Obtener historial de movimientos (Kardex) de una variante' })
  @ApiParam({ name: 'variantId', description: 'ID de la variante' })
  @Public()
  @Get('kardex/:variantId')
  @HttpCode(HttpStatus.OK)
  getKardex(@Param('variantId') variantId: string) {
    return this.inventoryService.getKardexByVariant(variantId);
  }

  @ApiOperation({ summary: 'Registrar un movimiento manual de inventario (Ajuste/Entrada/Salida)' })
  @Public()
  @Post('movements')
  @HttpCode(HttpStatus.CREATED)
  createManualMovement(@Body() body: {
    id_variant: string;
    id_warehouse: string;
    id_worker: string;
    type: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
    quantity: number;
    reason: string;
  }) {
    return this.inventoryService.createMovement(body);
  }

  // ==========================================
  // 3. ENDPOINTS: TRANSFERENCIAS INTERNAS (ALMACÉN ➡️ TIENDA)
  // ==========================================

  @ApiOperation({ summary: 'Listar todas las guías de transferencia interna registradas' })
  @Public()
  @Get('transfers')
  @HttpCode(HttpStatus.OK)
  findAllTransfers() {
    return this.inventoryService.findAllTransfers();
  }

  @ApiOperation({ summary: 'Crear una nueva solicitud de transferencia interna (Guía de Remisión)' })
  @Public()
  @Post('transfers')
  @HttpCode(HttpStatus.CREATED)
  createTransfer(@Body() body: {
    code: string;
    id_source_warehouse: string;
    id_target_warehouse: string;
    id_sender_worker: string;
    items: { id_variant: string; quantity: number }[];
  }) {
    return this.inventoryService.createTransfer(body);
  }

  @ApiOperation({ summary: 'Aprobar y procesar de forma atómica la transferencia (Inyecta el stock a tienda)' })
  @ApiParam({ name: 'id', description: 'ID de la transferencia (InventoryTransfer)' })
  @ApiBody({ schema: { type: 'object', properties: { id_worker_receiver: { type: 'string', example: '65f...1' } } } })
  @Public()
  @Patch('transfers/:id/complete')
  @HttpCode(HttpStatus.OK)
  completeTransfer(
    @Param('id') id: string,
    @Body('id_worker_receiver') receiverWorkerId: string,
  ) {
    return this.inventoryService.completeTransfer(id, receiverWorkerId);
  }
}