-- CreateEnum
CREATE TYPE "PromoCodeType" AS ENUM ('PERCENTAGE', 'FIXED_USD');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "product_offers" (
    "id" TEXT NOT NULL,
    "offeredPrice" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "sellerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,

    CONSTRAINT "product_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PromoCodeType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,

    CONSTRAINT "product_promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_offers_productId_status_idx" ON "product_offers"("productId", "status");

-- CreateIndex
CREATE INDEX "product_offers_buyerId_createdAt_idx" ON "product_offers"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "product_offers_sellerId_status_createdAt_idx" ON "product_offers"("sellerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "product_promo_codes_sellerId_createdAt_idx" ON "product_promo_codes"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "product_promo_codes_productId_isActive_idx" ON "product_promo_codes"("productId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "product_promo_codes_productId_code_key" ON "product_promo_codes"("productId", "code");

-- AddForeignKey
ALTER TABLE "product_offers" ADD CONSTRAINT "product_offers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_offers" ADD CONSTRAINT "product_offers_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_offers" ADD CONSTRAINT "product_offers_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promo_codes" ADD CONSTRAINT "product_promo_codes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promo_codes" ADD CONSTRAINT "product_promo_codes_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
