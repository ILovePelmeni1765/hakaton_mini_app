import { ArrayMaxSize, ArrayUnique, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ConfirmationType, ProblemCategory, ProblemPriority, ProblemStatus, ResolutionVoteType } from '@prisma/client';

export class CreateProblemDto {
  @IsString() @MinLength(5) @MaxLength(120) title: string;
  @IsString() @MinLength(10) @MaxLength(2000) description: string;
  @IsEnum(ProblemCategory) category: ProblemCategory;
  @IsEnum(ProblemPriority) priority: ProblemPriority = 'NORMAL';
  @IsNumber() @Min(-90) @Max(90) latitude: number;
  @IsNumber() @Min(-180) @Max(180) longitude: number;
  @IsString() @MinLength(3) @MaxLength(300) address: string;
  @IsArray() @ArrayMaxSize(6) @ArrayUnique() @IsString({ each: true }) mediaIds: string[] = [];
}
export class ConfirmationDto { @IsEnum(ConfirmationType) type: ConfirmationType; @IsOptional() @IsString() mediaId?: string }
export class TransitionDto { @IsEnum(ProblemStatus) to: ProblemStatus; @IsOptional() @IsString() @MinLength(3) reason?: string; @IsOptional() @IsString() organizationId?: string; @IsOptional() @IsDateString() dueAt?: string; @IsOptional() @IsString() duplicateOfId?: string }
export class UpdateProblemDto { @IsOptional() @IsEnum(ProblemCategory) category?: ProblemCategory; @IsOptional() @IsEnum(ProblemPriority) priority?: ProblemPriority }
export class CommentDto { @IsString() @MinLength(2) @MaxLength(3000) body: string; @IsOptional() @IsString() parentId?: string; @IsOptional() @IsString() type?: string; @IsOptional() @IsArray() @ArrayMaxSize(4) @ArrayUnique() @IsString({ each: true }) mediaIds?: string[] }
export class EvidenceDto { @IsString() @MinLength(1) mediaId: string }
export class ResolutionReportDto { @IsString() @MinLength(10) @MaxLength(3000) summary: string; @IsArray() @IsString({ each: true }) mediaIds: string[] }
export class ResolutionVoteDto { @IsEnum(ResolutionVoteType) vote: ResolutionVoteType; @IsOptional() @IsString() @MaxLength(1000) comment?: string; @IsOptional() @IsString() mediaId?: string }
export class OfficialResponseDto { @IsString() @MinLength(5) @MaxLength(3000) body: string }
