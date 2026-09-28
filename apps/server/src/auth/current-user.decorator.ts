import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export interface AuthUser { id: string; role: 'RESIDENT' | 'OPERATOR' | 'CONTRACTOR' | 'ADMIN'; email: string; displayName: string; organizationId?: string | null; districtId?: string | null }
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<{ user: AuthUser }>().user);
