import { Module } from '@nestjs/common';
import { ProblemsController } from './problems.controller';
import { ProblemsService } from './problems.service';
import { ProblemStateMachineService } from './problem-state-machine.service';
@Module({ controllers: [ProblemsController], providers: [ProblemsService, ProblemStateMachineService], exports: [ProblemsService, ProblemStateMachineService] }) export class ProblemsModule {}
