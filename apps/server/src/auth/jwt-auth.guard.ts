import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { assertAccountActive } from './account-status';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: unknown }>();
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException('Требуется авторизация');
    let payload: { sub?: string; id?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Сессия истекла');
    }
    const id = payload.sub ?? payload.id;
    if (!id) throw new UnauthorizedException('Войдите в аккаунт снова');
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, displayName: true, role: true, organizationId: true, districtId: true, reputation: true, trustLevel: true, usefulStreak: true, district: true, organization: true, isActive: true } });
    if (!user) throw new UnauthorizedException('Аккаунт не найден. Войдите снова.');
    assertAccountActive(user);
    request.user = user;
    return true;
  }
}
