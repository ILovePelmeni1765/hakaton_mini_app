-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('RESIDENT', 'OPERATOR', 'CONTRACTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."ProblemStatus" AS ENUM ('DRAFT', 'AWAITING_COMMUNITY_CONFIRMATION', 'COMMUNITY_CONFIRMED', 'OPERATOR_REVIEW', 'NEEDS_MORE_INFO', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'OPERATOR_VERIFICATION', 'COMMUNITY_VERIFICATION', 'RESOLVED', 'PARTIALLY_RESOLVED', 'DISPUTED', 'REOPENED', 'REJECTED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "public"."ProblemPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."ProblemCategory" AS ENUM ('LIGHTING', 'OPEN_MANHOLE', 'ROAD', 'SIDEWALK', 'WASTE', 'PLAYGROUND', 'ACCESSIBILITY', 'PUBLIC_TRANSPORT', 'SNOW', 'WATER_LEAK', 'ROAD_SIGN', 'FALLEN_TREE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ConfirmationType" AS ENUM ('EXISTS', 'NOT_FOUND', 'CHANGED', 'EVIDENCE');

-- CreateEnum
CREATE TYPE "public"."CommentType" AS ENUM ('RESIDENT', 'CLARIFICATION', 'OFFICIAL', 'CONTRACTOR', 'SYSTEM', 'INFO_REQUEST');

-- CreateEnum
CREATE TYPE "public"."ResolutionVoteType" AS ENUM ('FULLY_RESOLVED', 'PARTIALLY_RESOLVED', 'STILL_PRESENT', 'WORSE', 'CANNOT_VERIFY');

-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'RETURNED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('CONFIRMATION', 'OPERATOR_ACCEPTED', 'ASSIGNED', 'DEADLINE_CHANGED', 'WORK_STARTED', 'REPORT_SUBMITTED', 'COMMUNITY_VERIFICATION', 'DISPUTED', 'RESOLVED', 'MISSION_NEARBY', 'COMMENT');

-- CreateEnum
CREATE TYPE "public"."MediaKind" AS ENUM ('BEFORE', 'AFTER', 'EVIDENCE', 'COMMENT');

-- CreateEnum
CREATE TYPE "public"."MissionStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."District" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "cleanliness" INTEGER NOT NULL DEFAULT 70,
    "safety" INTEGER NOT NULL DEFAULT 70,
    "lighting" INTEGER NOT NULL DEFAULT 70,
    "accessibility" INTEGER NOT NULL DEFAULT 70,
    "roads" INTEGER NOT NULL DEFAULT 70,
    "improvement" INTEGER NOT NULL DEFAULT 70,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "telegramId" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'RESIDENT',
    "districtId" TEXT,
    "organizationId" TEXT,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "trustLevel" INTEGER NOT NULL DEFAULT 1,
    "usefulStreak" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Problem" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "public"."ProblemCategory" NOT NULL,
    "status" "public"."ProblemStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "public"."ProblemPriority" NOT NULL DEFAULT 'NORMAL',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "duplicateOfId" TEXT,
    "dueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "officialResponse" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProblemMedia" (
    "id" TEXT NOT NULL,
    "problemId" TEXT,
    "commentId" TEXT,
    "reportId" TEXT,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "kind" "public"."MediaKind" NOT NULL DEFAULT 'BEFORE',
    "alt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProblemConfirmation" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."ConfirmationType" NOT NULL,
    "hasPhoto" BOOLEAN NOT NULL DEFAULT false,
    "trustWeight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProblemSubscription" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "public"."CommentType" NOT NULL DEFAULT 'RESIDENT',
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isModerated" BOOLEAN NOT NULL DEFAULT false,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Assignment" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT,
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "plannedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResolutionReport" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "technicalConclusion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolutionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResolutionVote" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vote" "public"."ResolutionVoteType" NOT NULL,
    "comment" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolutionVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StatusHistory" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "fromStatus" "public"."ProblemStatus",
    "toStatus" "public"."ProblemStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mission" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "districtId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'target',
    "target" INTEGER NOT NULL,
    "reward" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."MissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MissionParticipation" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MissionParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReputationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "problemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "problemId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "public"."City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "District_slug_key" ON "public"."District"("slug");

-- CreateIndex
CREATE INDEX "District_cityId_idx" ON "public"."District"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_cityId_name_key" ON "public"."Organization"("cityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "public"."User"("telegramId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_districtId_idx" ON "public"."User"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_number_key" ON "public"."Problem"("number");

-- CreateIndex
CREATE INDEX "Problem_status_priority_idx" ON "public"."Problem"("status", "priority");

-- CreateIndex
CREATE INDEX "Problem_category_status_idx" ON "public"."Problem"("category", "status");

-- CreateIndex
CREATE INDEX "Problem_districtId_createdAt_idx" ON "public"."Problem"("districtId", "createdAt");

-- CreateIndex
CREATE INDEX "Problem_latitude_longitude_idx" ON "public"."Problem"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "ProblemMedia_problemId_idx" ON "public"."ProblemMedia"("problemId");

-- CreateIndex
CREATE INDEX "ProblemConfirmation_userId_createdAt_idx" ON "public"."ProblemConfirmation"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemConfirmation_problemId_userId_key" ON "public"."ProblemConfirmation"("problemId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemSubscription_problemId_userId_key" ON "public"."ProblemSubscription"("problemId", "userId");

-- CreateIndex
CREATE INDEX "Comment_problemId_createdAt_idx" ON "public"."Comment"("problemId", "createdAt");

-- CreateIndex
CREATE INDEX "Assignment_organizationId_status_idx" ON "public"."Assignment"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ResolutionVote_problemId_userId_key" ON "public"."ResolutionVote"("problemId", "userId");

-- CreateIndex
CREATE INDEX "StatusHistory_problemId_createdAt_idx" ON "public"."StatusHistory"("problemId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "public"."Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MissionParticipation_missionId_userId_key" ON "public"."MissionParticipation"("missionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "public"."Achievement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "public"."UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "ReputationEvent_userId_createdAt_idx" ON "public"."ReputationEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "public"."AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "public"."District" ADD CONSTRAINT "District_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Organization" ADD CONSTRAINT "Organization_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "public"."District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Problem" ADD CONSTRAINT "Problem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Problem" ADD CONSTRAINT "Problem_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "public"."District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Problem" ADD CONSTRAINT "Problem_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "public"."Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProblemMedia" ADD CONSTRAINT "ProblemMedia_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProblemMedia" ADD CONSTRAINT "ProblemMedia_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProblemMedia" ADD CONSTRAINT "ProblemMedia_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."ResolutionReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProblemConfirmation" ADD CONSTRAINT "ProblemConfirmation_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProblemConfirmation" ADD CONSTRAINT "ProblemConfirmation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProblemSubscription" ADD CONSTRAINT "ProblemSubscription_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProblemSubscription" ADD CONSTRAINT "ProblemSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResolutionReport" ADD CONSTRAINT "ResolutionReport_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResolutionReport" ADD CONSTRAINT "ResolutionReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResolutionReport" ADD CONSTRAINT "ResolutionReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResolutionVote" ADD CONSTRAINT "ResolutionVote_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResolutionVote" ADD CONSTRAINT "ResolutionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StatusHistory" ADD CONSTRAINT "StatusHistory_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StatusHistory" ADD CONSTRAINT "StatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "public"."District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionParticipation" ADD CONSTRAINT "MissionParticipation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionParticipation" ADD CONSTRAINT "MissionParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "public"."Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReputationEvent" ADD CONSTRAINT "ReputationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
