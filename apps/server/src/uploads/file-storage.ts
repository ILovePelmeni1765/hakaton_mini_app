import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const FILE_STORAGE = Symbol('FILE_STORAGE');
export interface FileStorageProvider { save(buffer: Buffer, extension: string): Promise<string>; }

@Injectable()
export class LocalFileStorageProvider implements FileStorageProvider {
  constructor(private readonly config: ConfigService) {}
  async save(buffer: Buffer, extension: string) {
    const directory = resolve(this.config.get('UPLOAD_DIR', './uploads'));
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(resolve(directory, filename), buffer);
    return `/uploads/${filename}`;
  }
}
