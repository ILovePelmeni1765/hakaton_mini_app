import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@ApiTags('uploads') @ApiBearerAuth() @Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}
  @Post('image')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } }))
  upload(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) { return this.uploads.save(user.id, file); }
}
