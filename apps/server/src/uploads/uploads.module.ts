import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { FILE_STORAGE, LocalFileStorageProvider } from './file-storage';
@Module({ controllers: [UploadsController], providers: [UploadsService, LocalFileStorageProvider, { provide: FILE_STORAGE, useExisting: LocalFileStorageProvider }], exports: [UploadsService, FILE_STORAGE] }) export class UploadsModule {}
