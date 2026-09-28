import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/public.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { DashboardService } from './dashboard.service';
import { AccountService } from './account.service';
import { IsBoolean, IsDateString, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

class NotificationSettingsDto {
  @IsBoolean() status: boolean;
  @IsBoolean() comments: boolean;
  @IsBoolean() missions: boolean;
  @IsBoolean() nearby: boolean;
  @IsBoolean() telegram: boolean;
}

class CreateMissionDto {
  @IsString() @MinLength(5) @MaxLength(120) title: string;
  @IsString() @MinLength(10) @MaxLength(1000) description: string;
  @IsInt() @Min(1) @Max(10000) target: number;
  @IsInt() @Min(1) @Max(1000) reward: number;
  @IsDateString() endsAt: string;
}

@ApiTags('dashboard') @ApiBearerAuth() @Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService, private readonly account: AccountService) {}
  @Public() @Get('health') health() { return this.dashboard.health(); }
  @Get('dashboard/summary') summary(@CurrentUser() user: AuthUser) { return this.dashboard.summary(user); }
  @Get('organizations') organizations() { return this.dashboard.organizations(); }
  @Get('missions') missions(@CurrentUser() user: AuthUser) { return this.dashboard.missions(user); }
  @Roles(UserRole.RESIDENT) @Post('missions/:id/join') joinMission(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.dashboard.joinMission(id, user); }
  @Roles(UserRole.ADMIN) @Post('missions') createMission(@Body() dto: CreateMissionDto, @CurrentUser() user: AuthUser) { return this.dashboard.createMission(dto, user); }
  @Get('profile') profile(@CurrentUser() user: AuthUser) { return this.dashboard.profile(user); }
  @Patch('profile') updateProfile(@Body() input: unknown, @CurrentUser() user: AuthUser) { return this.account.update(user, input); }
  @Get('profile/overview') accountOverview(@CurrentUser() user: AuthUser) { return this.account.overview(user); }
  @Get('profile/settings') settings(@CurrentUser() user: AuthUser) { return this.dashboard.settings(user); }
  @Patch('profile/settings') saveSettings(@Body() dto: NotificationSettingsDto, @CurrentUser() user: AuthUser) { return this.dashboard.saveSettings(user, dto); }
  @Get('notifications') notifications(@CurrentUser() user: AuthUser) { return this.dashboard.notifications(user); }
  @Post('notifications/read-all') readAll(@CurrentUser() user: AuthUser) { return this.dashboard.readAll(user); }
  @Post('notifications/:id/read') read(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.dashboard.readNotification(id, user); }
  @Roles(UserRole.OPERATOR, UserRole.ADMIN) @Get('analytics') analytics() { return this.dashboard.analytics(); }
  @Roles(UserRole.OPERATOR, UserRole.ADMIN) @Get('audit') audit() { return this.dashboard.audit(); }
  @Roles(UserRole.ADMIN) @Get('users') users() { return this.dashboard.users(); }
  @Roles(UserRole.ADMIN) @Post('users/:id/toggle') toggleUser(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.dashboard.toggleUser(id, user); }
}
