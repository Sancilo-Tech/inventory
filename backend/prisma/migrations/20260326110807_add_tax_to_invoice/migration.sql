-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "tax_amount" DECIMAL(10,2),
ADD COLUMN     "tax_id" UUID,
ADD COLUMN     "tax_percent" DECIMAL(5,2);
