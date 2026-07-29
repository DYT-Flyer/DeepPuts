-- AlterTable: add monetization columns to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;

-- CreateIndex (unique, skipped if already exists via IF NOT EXISTS trick)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_stripeCustomerId_key') THEN
    CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_stripeSubscriptionId_key') THEN
    CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");
  END IF;
END $$;

-- CreateTable: PageView (missing from init migration)
CREATE TABLE IF NOT EXISTS "PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "userAgent" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PageView_createdAt_idx') THEN
    CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PageView_path_idx') THEN
    CREATE INDEX "PageView_path_idx" ON "PageView"("path");
  END IF;
END $$;
