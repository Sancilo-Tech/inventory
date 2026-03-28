import { Router } from "express";
import asyncHandler from 'express-async-handler';
import authMiddleware from "../middleware/auth.middleware";
import { InvoiceController } from "../controller/invoice.controller";

const route = Router();

route.use(authMiddleware);

route.post("/create", asyncHandler(InvoiceController.createInvoice));
route.get("/all", asyncHandler(InvoiceController.getAllInvoices));
route.put("/update/:invoiceId", asyncHandler(InvoiceController.updateInvoice));
route.put("/mark-paid/:invoiceId", asyncHandler(InvoiceController.markAsPaid));
route.delete("/delete/:invoiceId", asyncHandler(InvoiceController.deleteInvoice));
route.get("/upcoming-alerts", asyncHandler(InvoiceController.getUpcomingAlerts));
route.post("/send-email", asyncHandler(InvoiceController.sendInvoiceEmail));

// auto invoice
route.post("/auto/create", asyncHandler(InvoiceController.autoInvoice));
route.get("/auto/all", asyncHandler(InvoiceController.getAllAutoInvoices));
route.put("/auto/update-status/:invoiceId", asyncHandler(InvoiceController.updateAutoInvoiceStatus));
route.put("/auto/update/:invoiceId", asyncHandler(InvoiceController.updateAutoInvoiceDetail));
route.delete("/auto/delete/:invoiceId", asyncHandler(InvoiceController.deleteAutoInvoice));

// checkin invoice
route.post("/checkin/finalize", asyncHandler(InvoiceController.finalizeCheckin));
route.get("/checkin/all", asyncHandler(InvoiceController.getCheckinInvoices));

export default route;
