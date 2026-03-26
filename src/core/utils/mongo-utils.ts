import { Types } from 'mongoose';

export const toObjectId = (id: string | Types.ObjectId): Types.ObjectId => {
  if (id instanceof Types.ObjectId) {
    return id;  // Si ya es ObjectId, no hacer nada
  }

  if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
    return new Types.ObjectId(id);  // Convertir string válido a ObjectId
  }

  // Si no es válido, lanzamos un error
  throw new Error(`Invalid ObjectId: ${id}`);
};