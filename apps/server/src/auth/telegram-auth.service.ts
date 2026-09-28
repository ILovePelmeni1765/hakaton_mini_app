import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

@Injectable()
export class TelegramAuthService {
  constructor(private readonly config: ConfigService) {}

  verify(initData: string, maxAgeSeconds = 86_400) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) throw new UnauthorizedException('Telegram-вход не настроен');
    const params = new URLSearchParams(initData);
    const receivedHash = params.get('hash');
    if (!receivedHash) throw new UnauthorizedException('Отсутствует подпись Telegram');
    params.delete('hash');
    const authDate = Number(params.get('auth_date'));
    if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) throw new UnauthorizedException('Данные Telegram устарели');
    const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(token).digest();
    const calculated = createHmac('sha256', secret).update(dataCheckString).digest('hex');
    const a = Buffer.from(receivedHash, 'hex');
    const b = Buffer.from(calculated, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('Неверная подпись Telegram');
    const userRaw = params.get('user');
    if (!userRaw) throw new UnauthorizedException('Пользователь Telegram не передан');
    return JSON.parse(userRaw) as { id: number; first_name: string; last_name?: string; username?: string };
  }
}
