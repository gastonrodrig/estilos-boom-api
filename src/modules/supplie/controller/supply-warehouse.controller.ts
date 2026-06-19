import { Controller, Get, Post, Body } from '@nestjs/common';
import { SupplyWarehouseService } from '../service/supply-warehouse.service';
import { Public } from 'src/auth/decorators';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Almacén de Insumos (Supply Warehouse)')
@Controller('supply-warehouse')
export class SupplyWarehouseController {
  constructor(private readonly warehouseService: SupplyWarehouseService) {}

  @Get('inventory')
  @Public()
  @ApiOperation({ summary: 'Obtener inventario con stock físico de insumos' })
  async getInventory() {
    return this.warehouseService.getInventory();
  }

  @Post('purchase')
  @Public()
  @ApiOperation({ summary: 'Registrar una compra de insumos en Gamarra' })
  async recordPurchase(@Body() body: any) {
    return this.warehouseService.recordPurchase(body);
  }

  @Post('dispatch')
  @Public()
  @ApiOperation({ summary: 'Registrar un despacho de insumos al taller' })
  async recordDispatch(@Body() body: any) {
    return this.warehouseService.recordDispatch(body);
  }

  @Post('return')
  @Public()
  @ApiOperation({ summary: 'Registrar una devolución de insumos sobrantes del taller' })
  async recordReturn(@Body() body: any) {
    return this.warehouseService.recordReturn(body);
  }

  @Get('transactions')
  @Public()
  @ApiOperation({ summary: 'Obtener historial de transacciones del almacén de insumos' })
  async getTransactions() {
    return this.warehouseService.getTransactions();
  }

  @Get('production-orders')
  @Public()
  @ApiOperation({ summary: 'Obtener órdenes de producción activas con sus insumos necesarios' })
  async getProductionOrders() {
    return this.warehouseService.getProductionOrders();
  }
}
