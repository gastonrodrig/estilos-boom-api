import { PaymentManualTransactionDocument } from '../../payment-manual/schemas/payment-manual-transaction.schema';
import { MercadoPagoTransactionDocument } from '../../mercadopago/schemas/mercadopago-transaction.schema';
import { UnifiedPaymentDto } from '../dto/unified-payment.dto';
import { UserDocument } from '../../user/schemas/user.schema';

export class UnifiedPaymentMapper {
  static mapManual(transaction: any): UnifiedPaymentDto {
    const paymentMethodMap: Record<string, string> = {
      qr: 'Yape / Plin',
      transfer: 'Transferencia',
    };

    let mappedStatus: 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO' | 'OBSERVADO' = 'PENDIENTE';
    if (transaction.status === 'approved') mappedStatus = 'VERIFICADO';
    if (transaction.status === 'rejected') mappedStatus = 'RECHAZADO';
    if (transaction.status === 'observed') mappedStatus = 'OBSERVADO';

    return {
      id: transaction._id.toString(),
      orderNumber: transaction.orderId?.orderNumber || 'S/N',
      clientName: transaction.userId?.name || 'Cliente Desconocido',
      method: paymentMethodMap[transaction.paymentMethod] || 'Transferencia',
      amount: transaction.amount,
      operationNumber: transaction.operationNumber,
      status: mappedStatus,
      observationMessage: transaction.observationMessage,
      transactionType: 'MANUAL',
      createdAt: transaction.createdAt,
    };
  }

  static mapMercadoPago(transaction: any): UnifiedPaymentDto {
    let mappedStatus: 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO' = 'PENDIENTE';
    if (transaction.status === 'approved') mappedStatus = 'VERIFICADO';
    if (transaction.status === 'rejected') mappedStatus = 'RECHAZADO';

    return {
      id: transaction._id.toString(),
      orderNumber: transaction.orderId?.orderNumber || 'S/N',
      clientName: transaction.userId?.name || 'Cliente Desconocido',
      method: `Mercado Pago - ${transaction.paymentMethodId || 'NA'}`,
      amount: transaction.amount,
      operationNumber: `MP-${transaction.paymentId}`,
      status: mappedStatus,
      transactionType: 'MERCADO_PAGO',
      createdAt: transaction.created_at || transaction.createdAt,
    };
  }
}
