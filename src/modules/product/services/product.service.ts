import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from 'src/modules/firebase/services';
import { CreateProductDto } from '../dto/create-product.dto';

@Injectable()
export class ProductService {   
  constructor(private readonly prisma: PrismaService,
    private readonly storageService: StorageService,) {}

  async create(createProductDto: CreateProductDto, files: Express.Multer.File[]) {
    const { variants, ...productData } = createProductDto;
    let imageUrls: string[] = [];

    try {
      // 1. Subir imágenes a Firebase si existen
      if (files && files.length > 0) {
        const uploadedImages = await this.storageService.uploadMultipleFiles(
          'products', // ubicación principal
          files, 
          createProductDto.sku // carpeta con el nombre del SKU para orden
        );
        imageUrls = uploadedImages.map((img: any) => img.url);
      }

      // 2. Crear producto en la DB con las URLs de Firebase
      return await this.prisma.product.create({
        data: {
          ...productData,
          images: imageUrls, // Guardamos el array de URLs
          variants: {
            create: variants, 
          },
        },
        include: {
          variants: true, 
          category: true,
        },
      });
    } catch (error) {
      // Si falla la DB, podríamos opcionalmente borrar las fotos de Firebase aquí
      console.error(error);
      throw new BadRequestException('Error al crear el producto. Verifica los datos.');
    }
  }

  async findAll(query: any) {
  const { category, section, maxPrice, colors } = query;
  
  let where: any = { is_active: true };

  // Filtro por Categoría y Sección (lo que ya tenías)
  if (category) where.category = { name: category };
  if (section === 'best-seller') where.is_best_seller = true;
  if (section === 'new-in') where.is_new_in = true;

  // NUEVO: Filtro por Precio
  if (maxPrice) {
    where.base_price = { lte: maxPrice }; // lte = "Menor o igual a"
  }

  // NUEVO: Filtro por Color (Relación con Variantes)
  if (colors) {
    // Convertimos a array si llega como un solo string
    const colorList = Array.isArray(colors) ? colors : [colors];
    
    where.variants = {
      some: { // "Que al menos una variante cumpla con..."
        color: { in: colorList }
      }
    };
  }

  return this.prisma.product.findMany({
    where,
    include: { category: true, variants: true },
    orderBy: { created_at: 'desc' }
  });
}

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id_product: id }, // <--- Usamos id_product según tu schema
      include: { 
        variants: true, 
        category: true 
      },
    });

    if (!product) throw new NotFoundException('Producto no encontrado en Estilos Boom');
    return product;
  }

  async update(id: string, updateProductDto: any, files: Express.Multer.File[]) {
  // 1. Buscamos el producto actual para obtener las rutas de las fotos viejas
  const currentProduct = await this.findOne(id);
  
  const { variants, ...productData } = updateProductDto;
  let finalImageUrls = currentProduct.images;

  try {
    // 2. ¿Hay fotos nuevas? -> BORRAMOS LAS ANTERIORES Y SUBIMOS LAS NUEVAS
    if (files && files.length > 0) {
      // Borramos físicamente de Firebase usando las URLs guardadas
      if (currentProduct.images && currentProduct.images.length > 0) {
        await this.storageService.deleteFiles(currentProduct.images);
      }

      // Subimos el nuevo set de imágenes
      const uploadedImages = await this.storageService.uploadMultipleFiles(
        'products',
        files,
        productData.sku || currentProduct.sku // Usamos el SKU nuevo o el que ya tenía
      );
      
      finalImageUrls = uploadedImages.map((img: any) => img.url);
    }

    // 3. Actualización atómica en la Base de Datos
    return await this.prisma.product.update({
      where: { id_product: id },
      data: {
        ...productData,
        images: finalImageUrls,
        // Si se envían variantes, reemplazamos el set completo
        ...(variants && {
          variants: {
            deleteMany: {}, // Limpieza total de variantes viejas
            create: variants, // Inserción de las nuevas
          },
        }),
      },
      include: {
        variants: true,
        category: true,
      },
    });

  } catch (error) {
    console.error("Error en Update Product:", error);
    throw new BadRequestException('No se pudo actualizar el producto. Verifica los datos o SKUs duplicados.');
  }
}

  // --- NUEVA LÓGICA DE STOCK ---
  async updateVariantStock(idVariant: string, newStock: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id_variant: idVariant }
    });

    if (!variant) throw new NotFoundException('La variante de producto no existe');

    return this.prisma.productVariant.update({
      where: { id_variant: idVariant },
      data: { stock: newStock },
    });
  }

  async deactivate(id: string) {
    return this.prisma.product.update({
      where: { id_product: id }, // <--- Corregido a id_product
      data: { is_active: false },
    });
  }
}