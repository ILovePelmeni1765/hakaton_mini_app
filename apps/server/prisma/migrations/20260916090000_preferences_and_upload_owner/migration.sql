ALTER TABLE "User" ADD COLUMN "notificationSettings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ProblemMedia" ADD COLUMN "uploadedById" TEXT;
