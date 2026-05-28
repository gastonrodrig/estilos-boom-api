import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentManualTransaction, PaymentManualTransactionDocument } from '../schemas/payment-manual-transaction.schema';
import { ProcessManualPaymentDto } from '../dto/process-manual-payment.dto';

@Injectable()
export class PaymentManualService {
  private readonly logger = new Logger(PaymentManualService.name);

  constructor(
    @InjectModel(PaymentManualTransaction.name) private transactionModel: Model<PaymentManualTransactionDocument>,
  ) {}

  async processPayment(dto: ProcessManualPaymentDto, userId: string) {
    try {
      const newTransaction = new this.transactionModel({
        userId: new Types.ObjectId(userId),
        orderId: dto.orderId ? new Types.ObjectId(dto.orderId) : new Types.ObjectId(), // Usually passed from the cart to order flow
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        operationNumber: dto.operationNumber,
        status: 'pending_validation',
      });

      await newTransaction.save();

      return {
        success: true,
        transactionId: newTransaction._id,
        status: newTransaction.status,
      };
    } catch (error) {
      this.logger.error('Error processing manual payment', error);
      throw new InternalServerErrorException('Error al procesar el pago manual');
    }
  }
}
