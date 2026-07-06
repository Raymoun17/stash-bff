-- Persist the extraction strategy used to create each watchlist item.
CREATE TYPE "ExtractionMode" AS ENUM ('standard', 'ai_fallback', 'ai_only');

ALTER TABLE "WatchlistItem"
ADD COLUMN "extractionMode" "ExtractionMode" NOT NULL DEFAULT 'standard';

-- New writes must supply the mode explicitly; the default above only backfills existing rows.
ALTER TABLE "WatchlistItem"
ALTER COLUMN "extractionMode" DROP DEFAULT;
