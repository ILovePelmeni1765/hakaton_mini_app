import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser, AuthUser } from './current-user.decorator';

class LoginDto { @IsEmail() email: string; @IsString() @MinLength(6) password: string }
class DemoDto { @IsIn(Object.values(UserRole)) role: UserRole; @IsOptional() @IsEmail() email?: string }
class TelegramDto { @IsString() @MinLength(1) initData: string }

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public() @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password); }
  @Public() @Post('demo') demo(@Body() dto: DemoDto) { return this.auth.demo(dto.role, dto.email); }
  @Public() @Post('telegram') telegram(@Body() dto: TelegramDto) { return this.auth.telegramLogin(dto.initData); }
  @Get('me') me(@CurrentUser() user: AuthUser) { return user; }
}
