-- Indexes to speed up the list/report queries that filter by location, type,
-- status, and time. All are additive and safe to run online.

CREATE INDEX IF NOT EXISTS "item_master_location_id_is_disable_idx"
  ON "item_master" ("location_id", "is_disable");

CREATE INDEX IF NOT EXISTS "invoices_location_id_invoice_type_idx"
  ON "invoices" ("location_id", "invoice_type");

CREATE INDEX IF NOT EXISTS "invoices_location_id_status_idx"
  ON "invoices" ("location_id", "status");

CREATE INDEX IF NOT EXISTS "transaction_log_item_id_idx"
  ON "transaction_log" ("item_id");

CREATE INDEX IF NOT EXISTS "transaction_log_created_at_idx"
  ON "transaction_log" ("created_at");

CREATE INDEX IF NOT EXISTS "transaction_log_transaction_type_idx"
  ON "transaction_log" ("transaction_type");

CREATE INDEX IF NOT EXISTS "transaction_log_remarks_idx"
  ON "transaction_log" ("remarks");
