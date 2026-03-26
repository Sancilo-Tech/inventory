-- CreateTable
CREATE TABLE "auto_invoices" (
    "invoice_id" UUID NOT NULL,
    "invoice_name" VARCHAR(200) NOT NULL,
    "supplier_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "due_date" INTEGER NOT NULL,
    "notes" TEXT,
    "location_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "invoice_type" "invoiceType" NOT NULL DEFAULT 'purchase',

    CONSTRAINT "auto_invoices_pkey" PRIMARY KEY ("invoice_id")
);
