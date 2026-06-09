-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "sessionToken" TEXT NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RawEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "tickers" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT,
    "publishedAt" DATETIME NOT NULL,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rawEventId" TEXT NOT NULL,
    "bearThesis" TEXT NOT NULL,
    "convictionScore" INTEGER NOT NULL,
    "signalType" TEXT NOT NULL,
    "affectedTickers" TEXT NOT NULL,
    "sector" TEXT,
    "catalystDate" DATETIME,
    "analysisJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Analysis_rawEventId_fkey" FOREIGN KEY ("rawEventId") REFERENCES "RawEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TickerCache" (
    "symbol" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "sector" TEXT,
    "assetClass" TEXT NOT NULL,
    "lastPrice" REAL,
    "priceUpdatedAt" DATETIME
);

-- CreateTable
CREATE TABLE "SchedulerRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL,
    "eventsFound" INTEGER NOT NULL DEFAULT 0,
    "eventsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "RawEvent_externalId_key" ON "RawEvent"("externalId");

-- CreateIndex
CREATE INDEX "RawEvent_publishedAt_idx" ON "RawEvent"("publishedAt");

-- CreateIndex
CREATE INDEX "RawEvent_assetClass_idx" ON "RawEvent"("assetClass");

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_rawEventId_key" ON "Analysis"("rawEventId");

-- CreateIndex
CREATE INDEX "Analysis_convictionScore_idx" ON "Analysis"("convictionScore");

-- CreateIndex
CREATE INDEX "Analysis_signalType_idx" ON "Analysis"("signalType");

-- CreateIndex
CREATE INDEX "Analysis_createdAt_idx" ON "Analysis"("createdAt");
