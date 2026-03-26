/*
  Warnings:

  - A unique constraint covering the columns `[invoice_number,invoice_type]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "invoices_invoice_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_invoice_type_key" ON "invoices"("invoice_number", "invoice_type");
