import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import { UploadResult } from 'src/core/interfaces';

@Injectable()
export class StorageService {

  async uploadFile(
    location: string, 
    file: Express.Multer.File, 
    folderName: string
  ): Promise<UploadResult> {
    const { originalname, buffer, mimetype } = file;
    const bucket = admin.storage().bucket();

    const uniqueFilename = `${Date.now()}-${originalname}`;
    const filePath = `${location}/${folderName}/${uniqueFilename}`;
    const fileBlob = bucket.file(filePath);

    await fileBlob.save(buffer, { contentType: mimetype });
    await fileBlob.makePublic();

    const [metadata] = await fileBlob.getMetadata();
    return {
      url: `https://storage.googleapis.com/${bucket.name}/${fileBlob.name}`,
      name: uniqueFilename,
      size: Number(metadata.size),
      storagePath: filePath
    };
  }

  async uploadMultipleFiles(
    location: string, 
    files: Express.Multer.File[] = [], 
    folderName: string
  ): Promise<object[]> {
    if (!Array.isArray(files)) {
      throw new Error('Files should be an array');
    }

    const bucket = admin.storage().bucket();
    const uploadedUrls: object[] = [];

    for (const file of files) {
      const { originalname, buffer, mimetype } = file;

      const uniqueFilename = `${Date.now()}-${originalname}`;
      const filePath = `${location}/${folderName}/${uniqueFilename}`;
      const fileBlob = bucket.file(filePath);

      await fileBlob.save(buffer, { contentType: mimetype });
      await fileBlob.makePublic();

      const [metadata] = await fileBlob.getMetadata();
      uploadedUrls.push({
        url: `https://storage.googleapis.com/${bucket.name}/${fileBlob.name}`,
        name: uniqueFilename,
        size: metadata.size,
        storagePath: filePath
      });
    }
    return uploadedUrls;
  }

  async deleteFile(pathOrUrl: string): Promise<void> {
    const bucket = admin.storage().bucket();

    let storagePath = pathOrUrl;
    const bucketDomain = `https://storage.googleapis.com/${bucket.name}/`;

    if (pathOrUrl.startsWith(bucketDomain)) {
      storagePath = pathOrUrl.replace(bucketDomain, "");
    }

    const file = bucket.file(storagePath);

    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`File not found: ${storagePath}`);
      return;
    }

    await file.delete();
    console.log(`File deleted: ${storagePath}`);
  }

  async deleteFiles(pathsOrUrls: string[]): Promise<void> {
    await Promise.all(pathsOrUrls.map((p) => this.deleteFile(p)));
  }
}
