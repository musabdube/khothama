/*
  Warnings:

  - You are about to drop the column `estimatedDelivery` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `trackingNumber` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "estimatedDelivery" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "estimatedDelivery",
DROP COLUMN "trackingNumber";
