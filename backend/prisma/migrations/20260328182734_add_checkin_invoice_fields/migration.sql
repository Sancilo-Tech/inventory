-- AlterEnum
ALTER TYPE "invoiceType" ADD VALUE 'checkin';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "grand_total" DECIMAL(10,2),
ADD COLUMN     "total_quantity" DECIMAL(10,2);
