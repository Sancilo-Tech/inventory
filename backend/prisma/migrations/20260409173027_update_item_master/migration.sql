/*
  Warnings:

  - A unique constraint covering the columns `[item_name,supplier_id]` on the table `item_master` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "supplier_master" ADD COLUMN     "secondary_email" VARCHAR(100),
ADD COLUMN     "secondary_phone" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "item_master_item_name_supplier_id_key" ON "item_master"("item_name", "supplier_id");
