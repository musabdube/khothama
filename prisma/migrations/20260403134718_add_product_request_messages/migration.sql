-- CreateTable
CREATE TABLE "product_request_conversations" (
    "id" TEXT NOT NULL,
    "productRequestId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_request_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_request_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "product_request_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_request_conversations_requesterId_lastMessageAt_idx" ON "product_request_conversations"("requesterId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "product_request_conversations_responderId_lastMessageAt_idx" ON "product_request_conversations"("responderId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "product_request_conversations_productRequestId_lastMessageA_idx" ON "product_request_conversations"("productRequestId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_request_conversations_productRequestId_requesterId__key" ON "product_request_conversations"("productRequestId", "requesterId", "responderId");

-- CreateIndex
CREATE INDEX "product_request_messages_conversationId_createdAt_idx" ON "product_request_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "product_request_messages_senderId_idx" ON "product_request_messages"("senderId");

-- AddForeignKey
ALTER TABLE "product_request_conversations" ADD CONSTRAINT "product_request_conversations_productRequestId_fkey" FOREIGN KEY ("productRequestId") REFERENCES "product_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_request_conversations" ADD CONSTRAINT "product_request_conversations_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_request_conversations" ADD CONSTRAINT "product_request_conversations_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_request_messages" ADD CONSTRAINT "product_request_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "product_request_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_request_messages" ADD CONSTRAINT "product_request_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
