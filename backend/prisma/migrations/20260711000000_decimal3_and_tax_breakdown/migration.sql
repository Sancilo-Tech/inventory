-- Widen decimal scale from 2 to 3 for money/quantity fields carried through
-- the check-in -> invoice sync pipeline. Increasing scale is non-destructive:
-- existing values (e.g. 10.50) are preserved as 10.500.

ALTER TABLE "invoices"
  ALTER COLUMN "amount" TYPE DECIMAL(12,3),
  ALTER COLUMN "tax_amount" TYPE DECIMAL(12,3),
  ALTER COLUMN "tax2_amount" TYPE DECIMAL(12,3),
  ALTER COLUMN "grand_total" TYPE DECIMAL(12,3),
  ALTER COLUMN "total_quantity" TYPE DECIMAL(12,3);

ALTER TABLE "transaction_log"
  ALTER COLUMN "quantity" TYPE DECIMAL(12,3),
  ALTER COLUMN "remaining_qty" TYPE DECIMAL(12,3),
  ALTER COLUMN "price" TYPE DECIMAL(12,3);

ALTER TABLE "item_master"
  ALTER COLUMN "current_qty" TYPE DECIMAL(12,3),
  ALTER COLUMN "purchase_price" TYPE DECIMAL(12,3),
  ALTER COLUMN "total_amount" TYPE DECIMAL(12,3);

-- Per-rate tax segregation for invoices created from a multi-tax check-in batch.
ALTER TABLE "invoices" ADD COLUMN "tax_breakdown" JSONB;
