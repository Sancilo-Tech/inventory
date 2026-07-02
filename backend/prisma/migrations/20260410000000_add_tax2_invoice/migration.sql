-- AlterTable invoices: add second tax fields
ALTER TABLE "invoices" ADD COLUMN "tax2_id" UUID,
ADD COLUMN "tax2_percent" DECIMAL(5,2),
ADD COLUMN "tax2_amount" DECIMAL(10,2);

-- AlterTable auto_invoices: add second tax fields
ALTER TABLE "auto_invoices" ADD COLUMN "tax2_id" UUID,
ADD COLUMN "tax2_percent" DECIMAL(5,2),
ADD COLUMN "tax2_amount" DECIMAL(10,2);
