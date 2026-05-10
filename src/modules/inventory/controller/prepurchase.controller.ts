import { Controller, Post, Body, Patch, Param, Get, Query } from '@nestjs/common';
import { PrePurchaseOrdersService } from '../service/prepurchase-order.service';
import { CreatePrePurchaseOrderDto,UpdateSupplierQuoteDto } from '../dto';
import { Public } from 'src/auth/decorators';
import { ConvertPrePurchaseOrderDto } from '../dto/convert-prepurchase.dto';

@Controller('pre-purchase-orders')
export class PrePurchaseOrdersController {
  constructor(private readonly preOrderService: PrePurchaseOrdersService) {}

  /**
   * 1. Iniciar el proceso de Precompra
   * POST /pre-purchase-orders
   */
  @Post()
  @Public() // Si quieres que este endpoint sea público (sin autenticación)
  async create(@Body() createDto: CreatePrePurchaseOrderDto) {
    return this.preOrderService.create(createDto);
  }

  /**
   * 2. Registrar la cotización de un proveedor y actualizar Ranking
   * PATCH /pre-purchase-orders/:id/quote
   * Aquí es donde el RankingService entra en acción automáticamente.
   */
  @Patch(':id/quote')
  @Public()
  async updateQuote(
    @Param('id') id: string,
    @Body() updateQuoteDto: UpdateSupplierQuoteDto,
  ) {
    return this.preOrderService.updateSupplierQuote(
      id,
      updateQuoteDto.id_agent,
      updateQuoteDto.items,
    );
  }

  /**
   * 3. Seleccionar al ganador y generar la Orden de Compra (OC)
   * POST /pre-purchase-orders/:id/convert
   */
  @Post(':id/convert')
  @Public()
  async convertToPurchaseOrder(
    @Param('id') id: string,
    @Body() convertDto: ConvertPrePurchaseOrderDto, // <-- Cambiado a DTO
  ) {
    // Accedemos a la propiedad desde el objeto convertDto
    return this.preOrderService.selectWinnerAndConvert(id, convertDto.id_agent, convertDto.delivery_date_estimated);
  }

  /**
   * 4. Listar precompras para monitorear el estado de comparación
   * GET /pre-purchase-orders
   */
  @Get()
  @Public()
  async findAll(@Query('type') type?: string) {
    return this.preOrderService.findAll(type); 
  }

  /**
   * 5. Ver detalle de una precompra (incluyendo ranking de cotizaciones)
   * GET /pre-purchase-orders/:id
   */
  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.preOrderService.findOne(id);
  }

  /**
   * 6. Actualizar el estado de la pre-orden (Seguimiento de Producción)
   * PATCH /pre-purchase-orders/:id/status
   */
  @Patch(':id/status')
  @Public()
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.preOrderService.updateStatus(id, status);
  }
}