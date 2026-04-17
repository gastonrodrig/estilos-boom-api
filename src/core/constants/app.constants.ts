export const APP_NAME = 'Estilos Boom API';
export const APP_DESCRIPTION = 'The Estilos Boom API description';
export const API_VERSION = 'v1';

export const API_PREFIX = 'api/v1';

export enum Roles {
  ADMIN = 'Administrador',
  CLIENT = 'Cliente',
  WORKER = 'Trabajador'
}

export enum Estado {
  ACTIVO = 'Activo',
  INACTIVO = 'Inactivo'
}

export enum DocType {
  DNI = 'DNI',
  RUC = 'RUC'
}

export const ROLE_PERMISSIONS = {
  [Roles.ADMIN]: [
    'dashboard:view',
    // Productos y Categorías
    'products:view', 'products:manage',
    'categories:view', 'categories:manage',
    // Almacén
    'inventory:view', 'inventory:manage',
    // Órdenes
    'orders:view', 'orders:manage',
    'payments:verify', // Específico de órdenes recientes
    // Cotizaciones
    'quotations:view', 'quotations:manage', 'quotations:verify-payment',
    // Pagos
    'payments:view', 'payments:manage',
    // Clientes
    'clients:view', 'clients:manage',
    // Reseñas
    'reviews:view'
  ],

  [Roles.CLIENT]: [
    'dashboard:view',
    'orders:view',
    'payments:create', // "Realizar pagos" en la captura
    'quotations:view',
    'profile:view', 'profile:manage' // Info personal y direcciones
  ],

  [Roles.WORKER]: [ // Mapeado al "Módulo de Almacenero"
    'dashboard:view',
    'workshops:view',
    'production:view', 'production:update',
    'inventory:view', 'inventory:update'
  ]
};