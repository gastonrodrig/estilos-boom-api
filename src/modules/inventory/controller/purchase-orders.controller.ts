import { Controller, Post, Get, Body, HttpCode, HttpStatus, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrdersService } from '../service';
import { CreatePurchaseOrderDto, UpdateOrderStatusDto } from '../dto';
import { Public } from 'src/auth/decorators';
import { RankingService } from '../service/ranking.service';

@ApiTags('Purchase Orders')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService, private readonly rankingService: RankingService) {}

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
  async simulateRanking(
    @Query('supplierId') supplierId: string,
    @Query('variantId') variantId: string,
    @Query('price') price: number, // Este es el currentQuotePrice
  ) {
    return this.rankingService.calculateGlobalRanking(supplierId, variantId, price);
  }
}