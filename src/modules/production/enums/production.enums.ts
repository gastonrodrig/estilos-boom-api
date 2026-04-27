export enum ProductionStatus {
    PLANIFICADO = 'PLANIFICADO',
    EN_TALLER = 'EN_TALLER',
    COMPLETADO = 'COMPLETADO',
    CANCELADO = 'CANCELADO',
}

export enum ProductionPriority {
    BAJA = 'BAJA',
    MEDIA = 'MEDIA',
    ALTA = 'ALTA',
    URGENTE = 'URGENTE',
}

export enum MovementType {
    ENTRADA = 'ENTRADA',
    CONSUMO = 'CONSUMO',
    AJUSTE = 'AJUSTE',
}

export enum AlertType {
    PROXIMIDAD = 'PROXIMIDAD',
    ATRASO = 'ATRASO',
    STOCK_INSUMOS = 'STOCK_INSUMOS',
}
