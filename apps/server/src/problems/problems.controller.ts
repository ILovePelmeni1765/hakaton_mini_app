import { Body, Controller, Delete, Get, Param, ParseFloatPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { CommentDto, ConfirmationDto, CreateProblemDto, EvidenceDto, OfficialResponseDto, ResolutionReportDto, ResolutionVoteDto, TransitionDto, UpdateProblemDto } from './problems.dto';
import { ProblemsService } from './problems.service';

@ApiTags('problems') @ApiBearerAuth() @Controller('problems')
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}
  @Get() list(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) { return this.problems.list(user, query); }
  @Get('similar') similar(@Query('category') category: string, @Query('lat', ParseFloatPipe) lat: number, @Query('lng', ParseFloatPipe) lng: number, @Query('radius') radius?: string) { return this.problems.similar(category, lat, lng, Number(radius ?? 300)); }
  @Get(':id') one(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.problems.one(id, user); }
  @Roles(UserRole.RESIDENT, UserRole.ADMIN) @Post() create(@Body() dto: CreateProblemDto, @CurrentUser() user: AuthUser) { return this.problems.create(dto, user); }
  @Roles(UserRole.RESIDENT) @Post(':id/confirmations') confirm(@Param('id') id: string, @Body() dto: ConfirmationDto, @CurrentUser() user: AuthUser) { return this.problems.confirm(id, dto, user); }
  @Roles(UserRole.RESIDENT) @Post(':id/evidence') evidence(@Param('id') id: string, @Body() dto: EvidenceDto, @CurrentUser() user: AuthUser) { return this.problems.addEvidence(id, dto, user); }
  @Post(':id/subscription') subscribe(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.problems.subscribe(id, user); }
  @Post(':id/transition') transition(@Param('id') id: string, @Body() dto: TransitionDto, @CurrentUser() user: AuthUser) { return this.problems.transition(id, dto, user); }
  @Roles(UserRole.OPERATOR, UserRole.ADMIN) @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateProblemDto, @CurrentUser() user: AuthUser) { return this.problems.updateMetadata(id, dto, user); }
  @Post(':id/comments') comment(@Param('id') id: string, @Body() dto: CommentDto, @CurrentUser() user: AuthUser) { return this.problems.comment(id, dto, user); }
  @Delete(':id/comments/:commentId') deleteComment(@Param('id') id: string, @Param('commentId') commentId: string, @CurrentUser() user: AuthUser) { return this.problems.deleteComment(id, commentId, user); }
  @Post(':id/comments/:commentId/report') reportComment(@Param('id') id: string, @Param('commentId') commentId: string) { return this.problems.reportComment(id, commentId); }
  @Roles(UserRole.OPERATOR, UserRole.ADMIN) @Post(':id/official-response') official(@Param('id') id: string, @Body() dto: OfficialResponseDto, @CurrentUser() user: AuthUser) { return this.problems.officialResponse(id, dto, user); }
  @Roles(UserRole.CONTRACTOR) @Post(':id/resolution-report') report(@Param('id') id: string, @Body() dto: ResolutionReportDto, @CurrentUser() user: AuthUser) { return this.problems.resolutionReport(id, dto, user); }
  @Roles(UserRole.RESIDENT) @Post(':id/resolution-votes') vote(@Param('id') id: string, @Body() dto: ResolutionVoteDto, @CurrentUser() user: AuthUser) { return this.problems.vote(id, dto, user); }
}
