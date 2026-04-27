// src/core/constants/supply.constants.ts

export enum OrderStatus {
  PENDING = 'PENDIENTE',
  CONFIRMED = 'CONFIRMADO',
  RECEIVED = 'RECIBIDO',
  CANCELLED = 'CANCELADO',
}

export enum MovementType {
  IN = 'ENTRADA',
  OUT = 'SALIDA',
  ADJUSTMENT = 'AJUSTE',
}