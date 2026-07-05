-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';
