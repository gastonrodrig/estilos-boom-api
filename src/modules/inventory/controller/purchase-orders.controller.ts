import { Controller, Post, Get, Body, HttpCode, HttpStatus, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrdersService } from '../service';
import { CreatePurchaseOrderDto, UpdateOrderStatusDto } from '../dto';
import { Public } from 'src/auth/decorators';
import { RankingService } from '../service/ranking.service';
import { PrePurchaseOrdersService } from '../service/prepurchase-order.service';

@ApiTags('Purchase Orders')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService, private readonly rankingService: RankingService,
    private readonly preOrderService: PrePurchaseOrdersService
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva Orden de Compra (Estado: PENDIENTE)' })
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.poService.create(dto);
  }

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todas las órdenes de compra' })
  findAll() {
    return this.poService.findAll();
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener detalle de una orden (incluye items)' })
  findOne(@Param('id') id: string) {
    return this.poService.findOne(id);
  }

  @Patch(':id/status')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar estado de la orden (Al pasar a RECIBIDO afecta stock y ranking)' })
  updateStatus(
    @Param('id') id: string, 
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.poService.updateStatus(id, dto);
  }

  // En purchase-orders.controller.ts
  @Get('simulate-ranking')
  @Public()
  async simulateRanking(
    @Query('supplierId') supplierId: string,
    @Query('variantId') variantId: string,
    @Query('price') price: number, // Este es el currentQuotePrice
  ) {
    return this.rankingService.calculateGlobalRanking(supplierId, variantId, price);
  }

  @Patch(':id/start-quality-check')
  @Public()
  async startQualityCheck(
    @Param('id') purchaseOrderId: string,
    @Body('preOrderId') preOrderId: string // 👈 Recibimos el ID de la OPP en el body
  ) {
    return this.poService.startQualityCheck(purchaseOrderId, preOrderId);
  }
@Patch(':id/approve')
  @Public()
  async approve(
    @Param('id') id: string,
    @Body() body: { 
      quality_rating: number; 
      workerId: string; 
      observations?: string; // 👈 Nuevo
      qty_incidences?: number; // 👈 Nuevo
    }
  ) {
    return this.poService.approveAndInventory(
      id, 
      body.quality_rating, 
      body.workerId,
      body.observations,
      body.qty_incidences
    );
  }
@Patch(':id/extend')
@Public() // O el decorador de seguridad que estés usando en URP
async extendDeliveryDate(
  @Param('id') id: string,
  @Body() body: { newDate: string; reason: string },
) {
  // Llamamos al servicio pasando el ID de la OC, la nueva fecha y el motivo
  return this.poService.extendDeliveryDate(id, body.newDate, body.reason);
}
}