-- CreateTable
CREATE TABLE "user_ratings" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raterId" TEXT NOT NULL,
    "ratedId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,

    CONSTRAINT "user_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_ratings_offerId_key" ON "user_ratings"("offerId");

-- CreateIndex
CREATE INDEX "user_ratings_ratedId_createdAt_idx" ON "user_ratings"("ratedId", "createdAt");

-- CreateIndex
CREATE INDEX "user_ratings_raterId_createdAt_idx" ON "user_ratings"("raterId", "createdAt");

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_ratedId_fkey" FOREIGN KEY ("ratedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "product_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
