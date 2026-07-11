CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionItem" (
    "collectionId" TEXT NOT NULL,
    "watchlistItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("collectionId", "watchlistItemId")
);

CREATE UNIQUE INDEX "Collection_userId_normalizedName_key" ON "Collection"("userId", "normalizedName");
CREATE INDEX "Collection_userId_createdAt_idx" ON "Collection"("userId", "createdAt");
CREATE INDEX "CollectionItem_watchlistItemId_idx" ON "CollectionItem"("watchlistItemId");

ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_watchlistItemId_fkey" FOREIGN KEY ("watchlistItemId") REFERENCES "WatchlistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
