import { Controller, Post, Body, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { MercadoPagoService } from '../services/mercadopago.service';
import { CreatePreferenceDto } from '../dto/create-preference.dto';
import { ProcessPaymentDto } from '../dto/process-payment.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import { FirebaseAuthGuard } from '../../../auth/guards/firebase-auth.guard';

@ApiTags('Mercado Pago (Payments)')
@Controller('mercadopago')
export class MercadoPagoController {
  constructor(private readonly mercadopagoService: MercadoPagoService) {}

  @ApiOperation({ summary: 'Crear preferencia de Mercado Pago (Brick)' })
  @ApiBearerAuth('firebase-auth')
  @UseGuards(FirebaseAuthGuard)
  @Post('preference')
  async createPreference(@Body() dto: CreatePreferenceDto, @Req() req: any) {
    const userId = req.user.uid;
    return this.mercadopagoService.createPreference(dto, userId);
  }

  @ApiOperation({ summary: 'Procesar pago desde Mercado Pago Brick' })
  @ApiBearerAuth('firebase-auth')
  @UseGuards(FirebaseAuthGuard)
  @Post('process')
  async processPayment(@Body() dto: ProcessPaymentDto, @Req() req: any) {
    const userId = req.user.uid;
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
