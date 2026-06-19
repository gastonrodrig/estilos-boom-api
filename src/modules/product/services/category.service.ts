import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../schemas';
import { CreateCategoryDto } from '../dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>
  ) {}

  // Normaliza el nombre para comparación: sin espacios extremos, sin acentos, lowercase
  private normalizeName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  // Mapeo manual para categorías donde el algoritmo no produce una abreviatura clara
  private static readonly ABBR_OVERRIDES: Record<string, string> = {
    'POLOS / TOPS':             'POLO',
    'PIJAMAS':                  'PIJM',
    'CONJUNTOS / SETS':         'CONJ',
    'ROPA INTERIOR / LENCERIA': 'ROIN',
  };

  // Deriva una abreviatura de 4 letras a partir del nombre
  private deriveAbbr(name: string): string {
    const upper = name.trim().toUpperCase();

    // Normaliza sin tildes para comparar con los overrides
    const normalized = upper.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (CategoryService.ABBR_OVERRIDES[normalized]) return CategoryService.ABBR_OVERRIDES[normalized];
    if (CategoryService.ABBR_OVERRIDES[upper])      return CategoryService.ABBR_OVERRIDES[upper];

    const words = upper.replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0].slice(0, 2) + words[1].slice(0, 2)).padEnd(4, 'X');
    return (words[0] ?? 'PROD').slice(0, 4).padEnd(4, 'X');
  }

  async findAll() {
    // Excluye solo las explícitamente desactivadas; documentos sin el campo se consideran activos
    return this.categoryModel.find({ status: { $ne: false } }).sort({ name: 1 });
  }

  async create(dto: CreateCategoryDto & { abbr?: string }) {
    const normalized = this.normalizeName(dto.name);

    // Verificar duplicado case-insensitive antes de intentar insertar
    const existing = await this.categoryModel.findOne({
      _normalized_name: normalized,
    });
    if (existing) throw new ConflictException(`Ya existe la categoría "${existing.name}"`);

    const category = new this.categoryModel({
      ...dto,
      name: dto.name.trim().toUpperCase(),
      abbr: (dto.abbr ?? this.deriveAbbr(dto.name)).toUpperCase().slice(0, 4),
      _normalized_name: normalized,
    });
    return await category.save();
  }

  async update(id: string, dto: Partial<CreateCategoryDto> & { abbr?: string; status?: boolean }) {
    const existing = await this.categoryModel.findById(id);
    if (!existing) throw new NotFoundException('Categoría no encontrada');

    // Si viene nombre nuevo, verificar que no duplique otra categoría
    if (dto.name) {
      const normalized = this.normalizeName(dto.name);
      const conflict = await this.categoryModel.findOne({
        _normalized_name: normalized,
        _id: { $ne: id },
      });
      if (conflict) throw new ConflictException(`Ya existe la categoría "${conflict.name}"`);
      (dto as any)._normalized_name = normalized;
      dto.name = dto.name.trim().toUpperCase();
      if (!dto.abbr) {
        (dto as any).abbr = this.deriveAbbr(dto.name).toUpperCase().slice(0, 4);
      }
    }

    if (dto.abbr) (dto as any).abbr = dto.abbr.toUpperCase().slice(0, 4);

    const updated = await this.categoryModel.findByIdAndUpdate(id, dto, { returnDocument: 'after' });
    return updated;
  }

  // Migración única: elimina índice legacy, deduplica, uppercasea y genera abbr.
  async migrateAbbr() {
    const collection = this.categoryModel.collection;

    // 1. Eliminar el índice único legacy name_1 si existe
    try {
      await collection.dropIndex('name_1');
    } catch {
      // No existía, ignorar
    }

    // 2. Cargar todas las categorías y deduplicar por nombre normalizado
    //    (conservar la más antigua, eliminar las repetidas)
    const all = await this.categoryModel.find().sort({ created_at: 1 });
    const seen = new Map<string, boolean>();
    const toDelete: string[] = [];

    for (const cat of all) {
      const key = this.normalizeName(cat.name);
      if (seen.has(key)) {
        toDelete.push(cat._id.toString());
      } else {
        seen.set(key, true);
      }
    }

    if (toDelete.length > 0) {
      await this.categoryModel.deleteMany({ _id: { $in: toDelete } });
    }

    // 3. Actualizar las que quedan: uppercase + abbr + normalized
    const remaining = await this.categoryModel.find();
    const ops = remaining.map(cat => {
      const upperName = cat.name.trim().toUpperCase();
      return {
        updateOne: {
          filter: { _id: cat._id },
          update: {
            $set: {
              name: upperName,
              abbr: this.deriveAbbr(upperName),
              _normalized_name: this.normalizeName(upperName),
            },
          },
        },
      };
    });

    if (ops.length > 0) await this.categoryModel.bulkWrite(ops);

    return {
      deleted_duplicates: toDelete.length,
      updated: ops.length,
      categories: remaining.map(c => ({
        name: c.name.trim().toUpperCase(),
        abbr: this.deriveAbbr(c.name.trim().toUpperCase()),
      })),
    };
  }

  async deactivate(id: string) {
    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      { status: false },
      { returnDocument: 'after' },
    );
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return { success: true };
  }
}