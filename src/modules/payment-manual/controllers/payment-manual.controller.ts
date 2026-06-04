import { Controller, Post, Body, Req, UseGuards, Patch, Param } from '@nestjs/common';
import { PaymentManualService } from '../services/payment-manual.service';
import { ProcessManualPaymentDto } from '../dto/process-manual-payment.dto';
import { AuthGuard } from '@nestjs/passport'; // Assumes you have an auth guard, you can mock if not

@Controller('payment-manual')
export class PaymentManualController {
  constructor(private readonly paymentManualService: PaymentManualService) {}

  // Remove UseGuards if testing without auth, but typically it should be protected
  // @UseGuards(AuthGuard('jwt'))
  @Post('process')
  async processPayment(@Body() dto: ProcessManualPaymentDto, @Req() req: any) {
    const userId = req.user?.id || '661413a968600d8d73b0a234'; // Fallback for testing, replace with actual user extraction
    return this.paymentManualService.processPayment(dto, userId);
  }

  @Patch('resubmit/:paymentId')
  async resubmitPayment(
    @Param('paymentId') paymentId: string, 
    @Body('newOperationNumber') newOperationNumber: string,
    @Req() req: any
  ) {
    const userId = req.user?.id || '661413a968600d8d73b0a234';
    return this.paymentManualService.resubmitPayment(paymentId, newOperationNumber, userId);
  }

  @Patch('resubmit-by-order/:orderId')
  async resubmitPaymentByOrderId(
    @Param('orderId') orderId: string, 
    @Body('newOperationNumber') newOperationNumber: string,
    @Req() req: any
  ) {
    const userId = req.user?.uid || '661413a968600d8d73b0a234'; // Firebase usually puts UID
    return this.paymentManualService.resubmitPaymentByOrderId(orderId, newOperationNumber, userId);
  }
}
