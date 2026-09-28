import { ForbiddenException } from '@nestjs/common';

export function assertAccountActive(user: { isActive: boolean }) {
  if (!user.isActive) throw new ForbiddenException({ code: 'ACCOUNT_SUSPENDED', message: 'Ваш аккаунт заблокирован. Для восстановления доступа обратитесь к администратору сервиса.' });
}
