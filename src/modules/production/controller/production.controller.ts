import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductionService } from '../service/production.service';
import { CreateProductionOrderDto } from '../dto/create-production-order.dto';
import { UpdateWorkshopQuoteDto } from '../dto/update-workshop-quote.dto';
import { ConfirmWorkshopDto } from '../dto/confirm-workshop.dto';
import { UpdateProductionStatusDto } from '../dto/update-status.dto';

@ApiTags('Production Orders')
@Controller('production-orders')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva orden de producción (Estado: CONTACTO_INICIAL)' })
  create(@Body() createDto: CreateProductionOrderDto) {
    return this.productionService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las órdenes de producción' })
  findAll() {
    return this.productionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de una orden de producción' })
  findOne(@Param('id') id: string) {
    return this.productionService.findOne(id);
  }

  @Patch(':id/quote')
  @ApiOperation({ summary: 'Registrar la cotización de un taller' })
  updateQuote(
    @Param('id') id: string,
    @Body() updateQuoteDto: UpdateWorkshopQuoteDto
  ) {
    return this.productionService.updateQuote(id, updateQuoteDto);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirmar el taller ganador (Avanza a EN_PRODUCCION)' })
  confirmWorkshop(
    @Param('id') id: string,
    @Body() confirmDto: ConfirmWorkshopDto
  ) {
    return this.productionService.confirmWorkshop(id, confirmDto.id_workshop);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar el estado de la orden (Ej. CONTROL_CALIDAD, COMPLETADA)' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateProductionStatusDto
  ) {
    return this.productionService.updateStatus(id, updateStatusDto.status);
  }

  @Patch(':id/substate')
  @ApiOperation({ summary: 'Actualizar sub-estado en taller (Ej. CORTE, CONFECCION)' })
  updateSubState(
    @Param('id') id: string,
    @Body() body: { step: string }
  ) {
    return this.productionService.updateSubState(id, body.step);
  }
}
