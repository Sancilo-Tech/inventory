/*
  Warnings:

  - The `quantity_type` column on the `transaction_log` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "transaction_log" DROP COLUMN "quantity_type",
ADD COLUMN     "quantity_type" TEXT NOT NULL DEFAULT 'gram';
