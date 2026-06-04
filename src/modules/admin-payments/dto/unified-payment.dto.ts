export class UnifiedPaymentDto {
  id: string;
  orderNumber: string;
  clientName: string;
  method: string;
  amount: number;
  operationNumber: string;
  status: 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO' | 'OBSERVADO';
  observationMessage?: string;
  transactionType: 'MANUAL' | 'MERCADO_PAGO';
  createdAt: Date;
}
