import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseUnavailableFilter } from './database-unavailable.filter';

@Global()
@Module({ providers: [PrismaService, { provide: APP_FILTER, useClass: DatabaseUnavailableFilter }], exports: [PrismaService] })
export class PrismaModule {}
