-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "onboardedAt" TIMESTAMP(3),
    "acceptedTermsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "sessionToken" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'polygon',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanonicalEvent" (
    "id" TEXT NOT NULL,
    "canonicalHash" TEXT NOT NULL,
    "primaryHeadline" TEXT NOT NULL,
    "summary" TEXT,
    "assetClass" TEXT NOT NULL,
    "primaryTicker" TEXT,
    "affectedTickers" TEXT NOT NULL,
    "mergedEventCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCluster" (
    "id" TEXT NOT NULL,
    "clusterName" TEXT,
    "canonicalEventId" TEXT NOT NULL,
    "matchExplanation" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventClusterMember" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "rawEventId" TEXT NOT NULL,
    "canonicalEventId" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventClusterMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'polygon',
    "providerEventId" TEXT,
    "source" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "tickers" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "rawJson" TEXT NOT NULL,
    "payloadHash" TEXT,
    "schemaVersion" TEXT NOT NULL DEFAULT 'v1',
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "quarantineReason" TEXT,
    "validationErrors" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingestionRunId" TEXT,
    "canonicalEventId" TEXT,

    CONSTRAINT "RawEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "canonicalEventId" TEXT NOT NULL,
    "bearThesis" TEXT NOT NULL,
    "convictionScore" INTEGER NOT NULL,
    "signalType" TEXT NOT NULL,
    "affectedTickers" TEXT NOT NULL,
    "sector" TEXT,
    "catalystDate" TIMESTAMP(3),
    "analysisJson" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "modelName" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "confidenceLabel" TEXT,
    "timeHorizon" TEXT,
    "severity" TEXT,
    "noveltyScore" INTEGER,
    "keyRisks" TEXT,
    "counterArgs" TEXT,
    "sourceQuality" TEXT,
    "industry" TEXT,
    "uncertaintyNotes" TEXT,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "stalledAt" TIMESTAMP(3),
    "priceSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisVersion" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "rawOutput" TEXT NOT NULL,
    "convictionScore" INTEGER NOT NULL,
    "bearThesis" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisPipelineRun" (
    "id" TEXT NOT NULL,
    "canonicalEventId" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "tokenUsage" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "retryHistory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisPipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "pubPrice" DOUBLE PRECISION,
    "price1d" DOUBLE PRECISION,
    "price5d" DOUBLE PRECISION,
    "price30d" DOUBLE PRECISION,
    "price90d" DOUBLE PRECISION,
    "priceCurrent" DOUBLE PRECISION,
    "spyReturn1d" DOUBLE PRECISION,
    "spyReturn30d" DOUBLE PRECISION,
    "spyReturn90d" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "parentId" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationFlag" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "commentId" TEXT,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailOnHighConviction" BOOLEAN NOT NULL DEFAULT false,
    "minConvictionThreshold" INTEGER NOT NULL DEFAULT 7,
    "watchlistAlertsOnly" BOOLEAN NOT NULL DEFAULT true,
    "emailDigestFrequency" TEXT NOT NULL DEFAULT 'none',

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReputation" (
    "userId" TEXT NOT NULL,
    "totalVotesGiven" INTEGER NOT NULL DEFAULT 0,
    "totalVotesReceived" INTEGER NOT NULL DEFAULT 0,
    "confirmedTheses" INTEGER NOT NULL DEFAULT 0,
    "invalidatedTheses" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReputation_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "TickerCache" (
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "sector" TEXT,
    "assetClass" TEXT NOT NULL,
    "lastPrice" DOUBLE PRECISION,
    "priceUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "TickerCache_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "SchedulerRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "jobType" TEXT NOT NULL DEFAULT 'full',
    "triggeredBy" TEXT NOT NULL DEFAULT 'cron',
    "eventsFound" INTEGER NOT NULL DEFAULT 0,
    "eventsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "deduplicatedCount" INTEGER NOT NULL DEFAULT 0,
    "claudeCost" DOUBLE PRECISION,
    "errorMessage" TEXT,

    CONSTRAINT "SchedulerRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsageLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "costUsd" DOUBLE PRECISION,
    "tokens" INTEGER,
    "latencyMs" INTEGER,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "IngestionRun_startedAt_idx" ON "IngestionRun"("startedAt");

-- CreateIndex
CREATE INDEX "IngestionRun_status_idx" ON "IngestionRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalEvent_canonicalHash_key" ON "CanonicalEvent"("canonicalHash");

-- CreateIndex
CREATE INDEX "CanonicalEvent_assetClass_firstSeenAt_idx" ON "CanonicalEvent"("assetClass", "firstSeenAt");

-- CreateIndex
CREATE INDEX "CanonicalEvent_primaryTicker_idx" ON "CanonicalEvent"("primaryTicker");

-- CreateIndex
CREATE UNIQUE INDEX "EventCluster_canonicalEventId_key" ON "EventCluster"("canonicalEventId");

-- CreateIndex
CREATE INDEX "EventCluster_canonicalEventId_idx" ON "EventCluster"("canonicalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventClusterMember_rawEventId_key" ON "EventClusterMember"("rawEventId");

-- CreateIndex
CREATE INDEX "EventClusterMember_clusterId_idx" ON "EventClusterMember"("clusterId");

-- CreateIndex
CREATE INDEX "EventClusterMember_canonicalEventId_idx" ON "EventClusterMember"("canonicalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "RawEvent_externalId_key" ON "RawEvent"("externalId");

-- CreateIndex
CREATE INDEX "RawEvent_publishedAt_idx" ON "RawEvent"("publishedAt");

-- CreateIndex
CREATE INDEX "RawEvent_assetClass_idx" ON "RawEvent"("assetClass");

-- CreateIndex
CREATE INDEX "RawEvent_payloadHash_idx" ON "RawEvent"("payloadHash");

-- CreateIndex
CREATE INDEX "RawEvent_processingStatus_idx" ON "RawEvent"("processingStatus");

-- CreateIndex
CREATE INDEX "RawEvent_canonicalEventId_idx" ON "RawEvent"("canonicalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_canonicalEventId_key" ON "Analysis"("canonicalEventId");

-- CreateIndex
CREATE INDEX "Analysis_convictionScore_idx" ON "Analysis"("convictionScore");

-- CreateIndex
CREATE INDEX "Analysis_signalType_idx" ON "Analysis"("signalType");

-- CreateIndex
CREATE INDEX "Analysis_createdAt_idx" ON "Analysis"("createdAt");

-- CreateIndex
CREATE INDEX "Analysis_sector_idx" ON "Analysis"("sector");

-- CreateIndex
CREATE INDEX "Analysis_isStale_idx" ON "Analysis"("isStale");

-- CreateIndex
CREATE INDEX "AnalysisVersion_analysisId_idx" ON "AnalysisVersion"("analysisId");

-- CreateIndex
CREATE INDEX "AnalysisPipelineRun_status_idx" ON "AnalysisPipelineRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisPipelineRun_canonicalEventId_promptVersion_modelNam_key" ON "AnalysisPipelineRun"("canonicalEventId", "promptVersion", "modelName", "inputHash");

-- CreateIndex
CREATE INDEX "PerformanceSnapshot_analysisId_idx" ON "PerformanceSnapshot"("analysisId");

-- CreateIndex
CREATE INDEX "PerformanceSnapshot_status_idx" ON "PerformanceSnapshot"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceSnapshot_analysisId_ticker_key" ON "PerformanceSnapshot"("analysisId", "ticker");

-- CreateIndex
CREATE INDEX "Vote_analysisId_idx" ON "Vote"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_analysisId_key" ON "Vote"("userId", "analysisId");

-- CreateIndex
CREATE INDEX "Comment_analysisId_idx" ON "Comment"("analysisId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "ModerationFlag_commentId_idx" ON "ModerationFlag"("commentId");

-- CreateIndex
CREATE INDEX "ModerationFlag_resolved_idx" ON "ModerationFlag"("resolved");

-- CreateIndex
CREATE INDEX "Watchlist_userId_idx" ON "Watchlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_userId_symbol_key" ON "Watchlist"("userId", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistNote_userId_symbol_key" ON "WatchlistNote"("userId", "symbol");

-- CreateIndex
CREATE INDEX "SavedFilter_userId_idx" ON "SavedFilter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "SchedulerRun_startedAt_idx" ON "SchedulerRun"("startedAt");

-- CreateIndex
CREATE INDEX "SchedulerRun_status_idx" ON "SchedulerRun"("status");

-- CreateIndex
CREATE INDEX "ApiUsageLog_provider_createdAt_idx" ON "ApiUsageLog"("provider", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCluster" ADD CONSTRAINT "EventCluster_canonicalEventId_fkey" FOREIGN KEY ("canonicalEventId") REFERENCES "CanonicalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventClusterMember" ADD CONSTRAINT "EventClusterMember_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "EventCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventClusterMember" ADD CONSTRAINT "EventClusterMember_rawEventId_fkey" FOREIGN KEY ("rawEventId") REFERENCES "RawEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventClusterMember" ADD CONSTRAINT "EventClusterMember_canonicalEventId_fkey" FOREIGN KEY ("canonicalEventId") REFERENCES "CanonicalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawEvent" ADD CONSTRAINT "RawEvent_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawEvent" ADD CONSTRAINT "RawEvent_canonicalEventId_fkey" FOREIGN KEY ("canonicalEventId") REFERENCES "CanonicalEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_canonicalEventId_fkey" FOREIGN KEY ("canonicalEventId") REFERENCES "CanonicalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisVersion" ADD CONSTRAINT "AnalysisVersion_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisPipelineRun" ADD CONSTRAINT "AnalysisPipelineRun_canonicalEventId_fkey" FOREIGN KEY ("canonicalEventId") REFERENCES "CanonicalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceSnapshot" ADD CONSTRAINT "PerformanceSnapshot_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationFlag" ADD CONSTRAINT "ModerationFlag_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationFlag" ADD CONSTRAINT "ModerationFlag_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistNote" ADD CONSTRAINT "WatchlistNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReputation" ADD CONSTRAINT "UserReputation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

