import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { FILE_STORAGE, FileStorageProvider } from './file-storage';

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, @Inject(FILE_STORAGE) private readonly storage: FileStorageProvider) {}

  async save(uploadedById: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не передан');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) throw new BadRequestException('Разрешены JPEG, PNG и WebP');
    const max = Number(this.config.get('MAX_UPLOAD_MB', 8)) * 1024 * 1024;
    if (file.size > max) throw new BadRequestException(`Максимальный размер — ${this.config.get('MAX_UPLOAD_MB', 8)} МБ`);
    try {
      const image = sharp(file.buffer, { failOn: 'error' });
      const metadata = await image.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) throw new Error('Invalid format');
      const output = await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
      const url = await this.storage.save(output, 'webp');
      return this.prisma.problemMedia.create({ data: { uploadedById, url, mimeType: 'image/webp', size: output.length, alt: 'Фотография городской проблемы' } });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Файл повреждён или не является изображением');
    }
  }
}
