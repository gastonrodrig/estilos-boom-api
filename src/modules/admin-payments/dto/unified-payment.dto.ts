export class UnifiedPaymentDto {
  id: string;
  orderNumber: string;
  clientName: string;
  method: string;
  amount: number;
  operationNumber: string;
  status: 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO';
  transactionType: 'MANUAL' | 'MERCADO_PAGO';
  createdAt: Date;
}
