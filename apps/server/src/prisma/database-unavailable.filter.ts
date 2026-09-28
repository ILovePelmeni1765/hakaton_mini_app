import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientInitializationError, Prisma.PrismaClientKnownRequestError)
export class DatabaseUnavailableFilter extends BaseExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientInitializationError | Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const code = exception instanceof Prisma.PrismaClientKnownRequestError ? exception.code : exception.errorCode;
    if (code && ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(code)) {
      host.switchToHttp().getResponse<Response>().status(503).json({
        statusCode: 503, code: 'DATABASE_UNAVAILABLE',
        message: 'Сервис временно недоступен. Попробуйте снова через минуту.',
      });
      return;
    }
    super.catch(exception, host);
  }
}
