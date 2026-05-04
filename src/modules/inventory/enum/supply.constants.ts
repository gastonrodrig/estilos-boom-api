// src/core/constants/supply.constants.ts

export enum OrderStatus {
  PENDING = 'PENDIENTE',
  CONFIRMED = 'EN_REVISION',
  RECEIVED = 'COMPLETADA',
  CANCELLED = 'CANCELADA',
}

export enum MovementType {
  IN = 'ENTRADA',
  OUT = 'SALIDA',
  ADJUSTMENT = 'AJUSTE',
}