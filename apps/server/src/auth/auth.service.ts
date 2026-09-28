import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramAuthService } from './telegram-auth.service';
import { ConfigService } from '@nestjs/config';
import { assertAccountActive } from './account-status';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly telegram: TelegramAuthService, private readonly config: ConfigService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { district: true, organization: true } });
    if (!user || !(await compare(password, user.passwordHash))) throw new UnauthorizedException('Неверная почта или пароль');
    return this.issue(user);
  }

  async demo(role: UserRole, email?: string) {
    if (this.config.get('DEMO_AUTH_ENABLED', 'true') !== 'true') throw new UnauthorizedException('Демонстрационный вход отключён');
    const defaultAccounts: Record<UserRole, string> = { RESIDENT: 'resident@pulse.local', OPERATOR: 'operator@pulse.local', CONTRACTOR: 'contractor@pulse.local', ADMIN: 'admin@pulse.local' };
    const user = await this.prisma.user.findFirst({ where: { role, email: email ?? defaultAccounts[role] }, include: { district: true, organization: true } });
    if (!user) throw new UnauthorizedException('Демонстрационный пользователь не найден');
    return this.issue(user);
  }

  async telegramLogin(initData: string) {
    const tg = this.telegram.verify(initData);
    const district = await this.prisma.district.findFirst();
    const user = await this.prisma.user.upsert({
      where: { telegramId: String(tg.id) },
      update: { displayName: [tg.first_name, tg.last_name].filter(Boolean).join(' ') },
      create: { telegramId: String(tg.id), email: `tg-${tg.id}@telegram.local`, passwordHash: '', displayName: [tg.first_name, tg.last_name].filter(Boolean).join(' '), districtId: district?.id },
      include: { district: true, organization: true },
    });
    return this.issue(user);
  }

  private async issue(user: { id: string; email: string; displayName: string; role: UserRole; organizationId: string | null; districtId: string | null; reputation: number; trustLevel: number; usefulStreak: number; district?: unknown; organization?: unknown; isActive: boolean }) {
    assertAccountActive(user);
    const payload = { id: user.id, sub: user.id, email: user.email, displayName: user.displayName, role: user.role, organizationId: user.organizationId, districtId: user.districtId };
    return { accessToken: await this.jwt.signAsync(payload), user: { ...payload, reputation: user.reputation, trustLevel: user.trustLevel, usefulStreak: user.usefulStreak, district: user.district, organization: user.organization } };
  }
}
