import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { MercadoPagoService } from '../services/mercadopago.service';
import { CreatePreferenceDto } from '../dto/create-preference.dto';
import { ProcessPaymentDto } from '../dto/process-payment.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';

@ApiTags('Mercado Pago (Payments)')
@Controller('mercadopago')
export class MercadoPagoController {
  constructor(private readonly mercadopagoService: MercadoPagoService) {}

  @ApiOperation({ summary: 'Crear preferencia de Mercado Pago (Brick)' })
  @ApiBearerAuth('firebase-auth')
  @Public() // Or remove if only authenticated users can pay
  @Post('preference')
  async createPreference(@Body() dto: CreatePreferenceDto, @Req() req: any) {
    // Note: If you require authentication, use req.user.uid instead of a hardcoded ID
    const userId = req.user?.uid || 'anonymous';
    return this.mercadopagoService.createPreference(dto, userId);
  }

  @ApiOperation({ summary: 'Procesar pago desde Mercado Pago Brick' })
  @ApiBearerAuth('firebase-auth')
  @Public()
  @Post('process')
  async processPayment(@Body() dto: ProcessPaymentDto, @Req() req: any) {
    const userId = req.user?.uid || '65f1a2b3c4d5e6f7a8b9c0d1'; // Fallback for guest checkout if allowed
    return this.mercadopagoService.processPayment(dto, userId);
  }

  @ApiOperation({ summary: 'Webhook de notificaciones de Mercado Pago' })
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    // MercadoPago webhooks must return 200 OK fast
    this.mercadopagoService.handleWebhook(body);
    return 'OK';
  }
}
