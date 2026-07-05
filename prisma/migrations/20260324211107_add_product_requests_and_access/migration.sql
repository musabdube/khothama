-- CreateTable
CREATE TABLE "product_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "category" TEXT,
    "budget" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "product_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_page_access" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "request_page_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_requests_userId_createdAt_idx" ON "product_requests"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "request_page_access_userId_key" ON "request_page_access"("userId");

-- CreateIndex
CREATE INDEX "request_page_access_userId_expiresAt_idx" ON "request_page_access"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "product_requests" ADD CONSTRAINT "product_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_page_access" ADD CONSTRAINT "request_page_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
