import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TelegramAuthService } from './telegram-auth.service';

@Global()
@Module({
  imports: [JwtModule.registerAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.get('JWT_SECRET', 'development-only-secret-change-me'), signOptions: { expiresIn: '7d' } }) })],
  controllers: [AuthController],
  providers: [AuthService, TelegramAuthService],
  exports: [JwtModule, AuthService, TelegramAuthService],
})
export class AuthModule {}
