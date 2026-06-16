import { Injectable, InternalServerErrorException, Logger, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentManualTransaction, PaymentManualTransactionDocument } from '../schemas/payment-manual-transaction.schema';
import { ProcessManualPaymentDto } from '../dto/process-manual-payment.dto';
import { SalesService } from '../../sales/services/sales.service';
import { User, UserDocument } from '../../user/schemas/user.schema';

@Injectable()
export class PaymentManualService {
  private readonly logger = new Logger(PaymentManualService.name);

  constructor(
    @InjectModel(PaymentManualTransaction.name) private transactionModel: Model<PaymentManualTransactionDocument>,
    private readonly salesService: SalesService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async processPayment(dto: ProcessManualPaymentDto, userId: string) {
    try {
      let queryUserId: Types.ObjectId;
      if (Types.ObjectId.isValid(userId)) {
        queryUserId = new Types.ObjectId(userId);
      } else {
        const user = await this.userModel.findOne({ auth_id: userId }).lean();
        if (user) {
          queryUserId = user._id as Types.ObjectId;
        } else {
          queryUserId = new Types.ObjectId('661413a968600d8d73b0a234');
        }
      }

      const newTransaction = new this.transactionModel({
        userId: queryUserId,
        orderId: dto.orderId ? new Types.ObjectId(dto.orderId) : new Types.ObjectId(), // Usually passed from the cart to order flow
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        operationNumber: dto.operationNumber,
        status: 'pending_validation',
      });

      // ¡Aquí nace el PORD! (El pedido web que verá el cliente)
      // Extraemos la información básica del DTO para la orden
      const orderData = {
        userId: queryUserId,
        clientName: dto.clientName || 'Cliente Temporal', // Idealmente sacar del DTO o JWT
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        deliveryMethod: dto.deliveryMethod || 'envio_estandar',
        items: dto.items || []
      };
      
      const pord = await this.salesService.createPreOrder(orderData);
      newTransaction.orderId = pord._id; // Enlazamos el pago con la orden generada

      await newTransaction.save();

      return {
        success: true,
        transactionId: newTransaction._id,
        status: newTransaction.status,
      };
    } catch (error) {
      this.logger.error('Error processing manual payment', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al procesar el pago manual');
    }
  }
  async resubmitPayment(paymentId: string, newOperationNumber: string, userId: string) {
    try {
      let queryUserId: Types.ObjectId;
      if (Types.ObjectId.isValid(userId)) {
        queryUserId = new Types.ObjectId(userId);
      } else {
        const user = await this.userModel.findOne({ auth_id: userId }).lean();
        if (user) {
          queryUserId = user._id as Types.ObjectId;
        } else {
          queryUserId = new Types.ObjectId('661413a968600d8d73b0a234');
        }
      }
      const payment = await this.transactionModel.findOne({ _id: paymentId, userId: queryUserId });
      if (!payment) {
        throw new Error('Pago no encontrado o no pertenece a este usuario');
      }

      if (payment.status !== 'observed' && payment.status !== 'rejected') {
        throw new Error('Solo se pueden volver a enviar pagos observados o rechazados');
      }

      payment.operationNumber = newOperationNumber;
      payment.status = 'pending_validation';
      payment.observationMessage = undefined;
      await payment.save();

      return {
        success: true,
        message: 'Operación reenviada con éxito para verificación',
      };
    } catch (error) {
      this.logger.error('Error resubmitting manual payment', error);
      throw new InternalServerErrorException('Error al reenviar la operación de pago');
    }
  }

  async resubmitPaymentByOrderId(orderId: string, newOperationNumber: string, userId: string) {
    try {
      const payment = await this.transactionModel.findOne({ orderId: new Types.ObjectId(orderId) });
      if (!payment) {
        throw new Error('Pago manual asociado a esta orden no encontrado');
      }

      if (payment.status !== 'observed' && payment.status !== 'rejected') {
        throw new Error('Solo se pueden volver a enviar pagos observados o rechazados');
      }

      payment.operationNumber = newOperationNumber;
      payment.status = 'pending_validation';
      payment.observationMessage = undefined;
      await payment.save();

      // Reset the order status to PRE_ORDER
      await this.salesService.updateOrderStatus(orderId, 'PRE_ORDER');

      return {
        success: true,
        message: 'Operación reenviada con éxito para verificación',
      };
    } catch (error) {
      this.logger.error('Error resubmitting manual payment by orderId', error);
      throw new InternalServerErrorException('Error al reenviar la operación de pago');
    }
  }
}
