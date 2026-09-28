import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AchievementsService } from './achievements.service';
import { AccountService } from './account.service';
@Module({ controllers: [DashboardController], providers: [DashboardService, AchievementsService, AccountService] }) export class DashboardModule {}
