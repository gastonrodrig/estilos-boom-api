import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express'; 
import { ProductionService } from '../service/production.service';
import { CreateProductionOrderDto } from '../dto/create-production-order.dto';
import { UpdateWorkshopQuoteDto } from '../dto/update-workshop-quote.dto';
import { ConfirmWorkshopDto } from '../dto/confirm-workshop.dto';
import { UpdateProductionStatusDto } from '../dto/update-status.dto';
import { AuthRoles, Public } from 'src/auth/decorators';


@ApiTags('Production Orders')
@Controller('production-orders')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Crear una nueva orden de producción (Estado: CONTACTO_INICIAL)' })
  create(@Body() createDto: CreateProductionOrderDto) {
    return this.productionService.create(createDto);
  }

  @Get()
   @Public()
  @ApiOperation({ summary: 'Listar todas las órdenes de producción' })
  findAll() {
    return this.productionService.findAll();
  }

  @Get(':id')
   @Public()
  @ApiOperation({ summary: 'Obtener el detalle de una orden de producción' })
  findOne(@Param('id') id: string) {
    return this.productionService.findOne(id);
  }

  @Patch(':id/quote')
   @Public()
  @ApiOperation({ summary: 'Registrar la cotización de un taller' })
  updateQuote(
    @Param('id') id: string,
    @Body() updateQuoteDto: UpdateWorkshopQuoteDto
  ) {
    return this.productionService.updateQuote(id, updateQuoteDto);
  }

  @Patch(':id/confirm')
   @Public()
  @ApiOperation({ summary: 'Confirmar el taller ganador (Avanza a EN_PRODUCCION)' })
  confirmWorkshop(
    @Param('id') id: string,
    @Body() confirmDto: ConfirmWorkshopDto
  ) {
    return this.productionService.confirmWorkshop(id, confirmDto.id_workshop);
  }

  @Patch(':id/status')
   @Public()
  @ApiOperation({ summary: 'Actualizar el estado de la orden (Ej. CONTROL_CALIDAD, COMPLETADA)' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateProductionStatusDto
  ) {
    return this.productionService.updateStatus(id, updateStatusDto.status);
  }

  @Patch(':id/substate')
   @Public()
  @ApiOperation({ summary: 'Actualizar sub-estado en taller (Ej. CORTE, CONFECCION)' })
  updateSubState(
    @Param('id') id: string,
    @Body() body: { step: string }
  ) {
    return this.productionService.updateSubState(id, body.step);
  }

  @Patch(':id/confirm-supplies')
  @Public()
  @ApiOperation({ summary: 'Almacenero confirma que los insumos están disponibles para esta orden' })
  confirmSupplies(@Param('id') id: string) {
    return this.productionService.confirmSupplies(id);
  }

  @Post(':id/generate-reception')
  @Public()
  @ApiOperation({ summary: 'Genera manualmente el documento de recepción para una orden en CONTROL_CALIDAD' })
  generateReceptionDoc(@Param('id') id: string) {
    return this.productionService.generateReceptionDoc(id);
  }

  @Delete(':id')
  @Public()
  @ApiOperation({ summary: 'Eliminar una orden de producción (solo para desarrollo)' })
  remove(@Param('id') id: string) {
    return this.productionService.remove(id);
  }

  // ========================================================
  // 🔥 WEBHOOK DE TWILIO WHATSAPP
  // ========================================================
  @Post('whatsapp/webhook')
   @Public()
  @ApiOperation({ summary: 'Webhook para recibir mensajes de Twilio WhatsApp Sandbox' })
  async handleTwilioWebhook(@Req() req: Request, @Res() res: Response) {
    const twimlResponse = await this.productionService.handleWhatsAppWebhook(req.body);
    
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twimlResponse);
  }
}