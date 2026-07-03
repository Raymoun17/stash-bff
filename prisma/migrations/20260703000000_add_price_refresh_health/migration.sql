ALTER TABLE "WatchlistItem"
ADD COLUMN "lastRefreshAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastRefreshedAt" TIMESTAMP(3),
ADD COLUMN "lastRefreshError" TEXT,
ADD COLUMN "consecutiveRefreshFailures" INTEGER NOT NULL DEFAULT 0;
