import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from '../service';
import { Public } from 'src/auth/decorators';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('kardex/:variantId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener historial de movimientos (Kardex) de una variante' })
  getKardex(@Param('variantId') variantId: string) {
    return this.inventoryService.getKardexByVariant(variantId);
  }

  @Get('movements')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todos los movimientos de inventario registrados' })
  findAll() {
    return this.inventoryService.findAllMovements();
  }
}