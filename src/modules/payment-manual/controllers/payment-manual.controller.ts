import { Controller, Post, Body, Req, UseGuards, Patch, Param } from '@nestjs/common';
import { PaymentManualService } from '../services/payment-manual.service';
import { ProcessManualPaymentDto } from '../dto/process-manual-payment.dto';
import { FirebaseAuthGuard } from '../../../auth/guards/firebase-auth.guard';

@Controller('payment-manual')
@UseGuards(FirebaseAuthGuard)
export class PaymentManualController {
  constructor(private readonly paymentManualService: PaymentManualService) {}

  @Post('process')
  async processPayment(@Body() dto: ProcessManualPaymentDto, @Req() req: any) {
    const userId = req.user.uid;
    return this.paymentManualService.processPayment(dto, userId);
  }

  @Patch('resubmit/:paymentId')
  async resubmitPayment(
    @Param('paymentId') paymentId: string, 
    @Body('newOperationNumber') newOperationNumber: string,
    @Req() req: any
  ) {
    const userId = req.user.uid;
    return this.paymentManualService.resubmitPayment(paymentId, newOperationNumber, userId);
  }

  @Patch('resubmit-by-order/:orderId')
  async resubmitPaymentByOrderId(
    @Param('orderId') orderId: string, 
    @Body('newOperationNumber') newOperationNumber: string,
    @Req() req: any
  ) {
    const userId = req.user.uid;
    return this.paymentManualService.resubmitPaymentByOrderId(orderId, newOperationNumber, userId);
  }
}
