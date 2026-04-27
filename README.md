# Estilos Boom API 🚀

Este es el backend de **Estilos Boom**, una plataforma robusta construida con **NestJS** y **MongoDB**, diseñada para gestionar productos, usuarios, carritos de compra y más, con integración de Firebase y servicios de mensajería asíncrona.

---

## 🛠️ Tecnologías y Stack
- **Framework:** [NestJS](https://nestjs.com/) (Node.js)
- **Lenguaje:** TypeScript
- **Base de Datos:** [MongoDB](https://www.mongodb.com/) con [Mongoose](https://mongoosejs.com/)
- **Autenticación:** Firebase Admin SDK (Passport.js)
- **Colas y Tareas:** [BullMQ](https://docs.bullmq.io/) (Redis)
- **Documentación:** Swagger / OpenAPI
- **Servicios Cloud:** Firebase Storage & Google Cloud APIs
- **Correo:** Nodemailer

---

## 📁 Estructura del Proyecto

El proyecto sigue una arquitectura **modular**, facilitando la escalabilidad y el mantenimiento:

```text
src/
├── auth/           # Lógica de autenticación (estrategias, guards, decoradores)
├── config/         # Configuración global y validación de variables de entorno
├── core/           # Elementos compartidos por toda la aplicación
│   ├── common/     # Decoradores y utilidades comunes
│   ├── constants/  # Constantes globales (nombres de apps, versiones)
│   ├── filters/    # Filtros de excepciones globales
│   ├── interceptors/ # Interceptores (ej. LoggingInterceptor)
│   ├── interfaces/ # Interfaces genéricas
│   └── utils/      # Funciones de ayuda (helpers)
├── modules/        # Módulos funcionales de la aplicación
│   ├── user/       # Gestión de usuarios, roles y clientes
│   ├── product/    # Catálogo de productos y variantes
│   ├── production/ # Gestión de fabricación, insumos y taller (Nuevo)
│   ├── cart/       # Carrito de compras y procesos de checkout
│   ├── firebase/   # Integración con Firebase Storage y Auth
│   └── mail/       # Plantillas y envío de correos (vía BullMQ)
├── main.ts         # Punto de entrada de la aplicación
└── app.module.ts   # Módulo raíz que orquesta los demás módulos
```

---

## 💻 Formato de Código y Estándares

- **Clean Architecture:** Separación clara entre controladores (entrada), servicios (lógica de negocio) y repositorios/esquemas (datos).
- **TypeScript:** Uso estricto de tipos e interfaces.
- **DTOs (Data Transfer Objects):** Cada entrada de datos está validada mediante `class-validator` y `class-transformer`.
- **Inyección de Dependencias:** Uso nativo de NestJS para desacoplar componentes.
- **Programación Reactiva:** Uso de `RxJS` para flujos de datos asíncronos cuando es necesario.

---

## 📊 Arquitectura de Datos (Schemas)

Usamos **Mongoose** con decoradores de NestJS para definir los modelos. Los esquemas incluyen:
- **Timestamps:** Registro automático de `created_at` y `updated_at`.
- **Relaciones:** Uso de `Types.ObjectId` y `ref` para vincular documentos (ej. Variantes de producto -> Producto).
- **Validación:** Restricciones directamente en el esquema (required, unique, default).

**Ejemplo de Estructura (ProductVariant):**
```typescript
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'ProductVariant' })
export class ProductVariant {
  @Prop({ required: true }) size: string;
  @Prop({ required: true }) color: string;
  @Prop({ default: 0 }) stock: number;
  @Prop({ required: true, unique: true }) sku_variant: string;
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true }) id_product: Types.ObjectId;
}
```

---

## 🚀 Estado Actual del Desarrollo

Actualmente, el backend cuenta con las siguientes funcionalidades operativas:

1.  **Auth Module:** Autenticación fluida con Firebase.
2.  **User Module:** Gestión de usuarios de sistema y clientes finales.
3.  **Product Module:** CRUD de productos, gestión de categorías y variantes (tallas/colores).
4.  **Cart Module:** Lógica para manejar carritos de compra persistentes.
5.  **Mail Module:** Infraestructura preparada para envío de correos asíncronos (Bienvenida, Recuperación, etc.).
6.  **Firebase Integration:** Subida de imágenes a Firebase Storage automatizada para productos.
7.  **Production Module:** Gestión integral del ciclo de fabricación, control de materias primas, órdenes de taller y alertas automáticas de entrega.

---

## 🏁 Cómo Empezar

### Requisitos
- Node.js (v18+)
- MongoDB corriendo localmente o en la nube.
- Redis (para BullMQ).

### Instalación
```bash
npm install
```

### Configuración
Crea un archivo `.env` basado en los requerimientos del sistema:
```env
# APP
PORT=3001
NODE_ENV=development

# MONGO
MONGO_URI=mongodb://localhost:27017/estilos-boom

# FIREBASE
FIREBASE_CREDENTIALS_PATH=[BASE64_CERTIFICATE]
FIREBASE_STORAGE_BUCKET=estilos-boom.appspot.com

# REDIS
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Ejecución
```bash
# Desarrollo con watch mode
npm run start:dev

# Producción
npm run build
npm run start:prod
```

### 📖 Documentación API
Una vez iniciada la aplicación, puedes acceder a la documentación interactiva (Swagger) en:
`http://localhost:3001/api/docs`

---

¡Construido con ❤️ por el equipo de Estilos Boom!
