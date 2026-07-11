import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { transporter, mailGenerator } from "../config/email.config";
const PDFDocument = require('pdfkit');

export class InvoiceController {
    static async createInvoice(req: any, res: Response, next: NextFunction) {
        try {
            const { invoice_number, invoice_name, supplier_id, amount, invoice_date, due_date, notes, type, tax_id, tax_percent, tax_amount, tax2_id, tax2_percent, tax2_amount } = req.body;
            const locationId = req.headers.location_id;
            const userId = req.user.id;

            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const invoice = await prisma.invoice.create({
                data: {
                    invoiceNumber: invoice_number,
                    invoiceName: invoice_name,
                    supplierId: supplier_id || null,
                    amount: amount,
                    invoiceDate: new Date(invoice_date),
                    dueDate: new Date(due_date),
                    notes: notes || null,
                    locationId: locationId,
                    createdBy: userId,
                    invoiceType: type || 'purchase',
                    taxId: tax_id || null,
                    taxPercent: tax_percent || null,
                    taxAmount: tax_amount || null,
                    tax2Id: tax2_id || null,
                    tax2Percent: tax2_percent || null,
                    tax2Amount: tax2_amount || null,
                }
            });

            res.status(201).json(invoice);
        } catch (err) {
            next(err);
        }
    }

    static async getAllInvoices(req: any, res: Response, next: NextFunction) {
        try {
            const { status,type } = req.query;
            const locationId = req.headers.location_id;

            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const whereClause: any = { locationId: locationId };
            if (status) {
                whereClause.status = status;
            }
            if (type) {
                whereClause.invoiceType = type;
            }
            
            // console.log(whereClause)
            const invoices = await prisma.invoice.findMany({
                where: whereClause,
            
                orderBy: { invoiceDate: 'desc' }
            });

            res.status(200).json(invoices);
        } catch (err) {
            next(err);
        }
    }

    // Server-side paginated invoice list with a summary computed over the whole
    // filtered set (not just the current page). All date math is done by the
    // caller and passed as explicit ranges to keep the same semantics as before.
    static async getPaginatedInvoices(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) { res.status(400).json({ message: "Location ID required" }); return; }

            const {
                type, status, page = 1, limit = 10,
                invoiceStartDate, invoiceEndDate, dueStartDate, dueEndDate,
            } = req.query;

            const take = Math.min(Number(limit) || 10, 500);
            const currentPage = Math.max(Number(page) || 1, 1);

            const where: any = { locationId };
            if (type) where.invoiceType = type;
            if (status) where.status = status;
            if (invoiceStartDate && invoiceEndDate) {
                where.invoiceDate = { gte: new Date(invoiceStartDate as string), lte: new Date(invoiceEndDate as string) };
            }
            if (dueStartDate && dueEndDate) {
                where.dueDate = { gte: new Date(dueStartDate as string), lte: new Date(dueEndDate as string) };
            }

            const all = await prisma.invoice.findMany({ where });

            // Summary over the full filtered set.
            let totalAmount = 0, totalTax = 0;
            const taxGroups: Record<string, { amount: number; tax: number; total: number }> = {};
            const addGroup = (pctRaw: any, base: number, tax: number) => {
                const pct = `${Math.round(Number(pctRaw))}%`;
                if (!taxGroups[pct]) taxGroups[pct] = { amount: 0, tax: 0, total: 0 };
                taxGroups[pct].amount += base;
                taxGroups[pct].tax += tax;
                taxGroups[pct].total += base + tax;
            };
            for (const inv of all) {
                const amount = Number(inv.amount || 0);
                const tax = Number(inv.taxAmount || 0);
                totalAmount += amount;
                totalTax += tax;
                const breakdown = inv.taxBreakdown as any[] | null;
                if (Array.isArray(breakdown) && breakdown.length > 0) {
                    breakdown.forEach(g => addGroup(g.percent, Number(g.base || 0), Number(g.tax || 0)));
                } else if (inv.taxPercent) {
                    addGroup(inv.taxPercent, amount, tax);
                    if (inv.tax2Percent) addGroup(inv.tax2Percent, 0, Number(inv.tax2Amount || 0));
                }
            }

            // Sort: unpaid before paid, due-soon (<=3 days) first, then by days-until-due.
            const daysUntil = (d: Date) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
            all.sort((a, b) => {
                const aPaid = a.status === 'paid', bPaid = b.status === 'paid';
                if (aPaid && !bPaid) return 1;
                if (!aPaid && bPaid) return -1;
                const aDays = daysUntil(a.dueDate), bDays = daysUntil(b.dueDate);
                if (aDays <= 3 && bDays > 3) return -1;
                if (aDays > 3 && bDays <= 3) return 1;
                return aDays - bDays;
            });

            const total = all.length;
            const pageItems = all.slice((currentPage - 1) * take, currentPage * take);

            res.status(200).json({
                invoices: pageItems,
                pagination: { total, page: currentPage, limit: take, totalPages: Math.ceil(total / take) },
                summary: {
                    totalAmount: parseFloat(totalAmount.toFixed(3)),
                    totalTax: parseFloat(totalTax.toFixed(3)),
                    totalInclusive: parseFloat((totalAmount + totalTax).toFixed(3)),
                    taxGroups,
                },
            });
        } catch (err) {
            next(err);
        }
    }

    static async updateInvoice(req: any, res: Response, next: NextFunction) {
        try {
            const { invoiceId } = req.params;
            const { invoice_number, invoice_name, supplier_id, amount, invoice_date, due_date, notes, status, type, tax_id, tax_percent, tax_amount, tax2_id, tax2_percent, tax2_amount } = req.body;

            const updateData: any = {
                invoiceNumber: invoice_number,
                invoiceName: invoice_name,
                supplierId: supplier_id || null,
                amount: amount,
                invoiceDate: new Date(invoice_date),
                dueDate: new Date(due_date),
                notes: notes || null,
                status: status,
                taxId: tax_id || null,
                taxPercent: tax_percent || null,
                taxAmount: tax_amount || null,
                tax2Id: tax2_id || null,
                tax2Percent: tax2_percent || null,
                tax2Amount: tax2_amount || null,
            };

            if (type) {
                updateData.invoiceType = type;
            }

            const invoice = await prisma.invoice.update({
                where: { invoiceId: invoiceId },
                data: updateData
            });

            res.status(200).json(invoice);
        } catch (err) {
            next(err);
        }
    }

    static async markAsPaid(req: any, res: Response, next: NextFunction) {
        try {
            const { invoiceId } = req.params;
            const { payment_mode, paid_date } = req.body;

            const invoice = await prisma.invoice.update({
                where: { invoiceId: invoiceId },
                data: {
                    status: 'paid',
                    paidDate: paid_date ? new Date(paid_date) : new Date(),
                    paymentMode: payment_mode
                }
            });

            res.status(200).json(invoice);
        } catch (err) {
            next(err);
        }
    }

    static async deleteInvoice(req: any, res: Response, next: NextFunction) {
        try {
            const { invoiceId } = req.params;

            await prisma.invoice.delete({
                where: { invoiceId: invoiceId }
            });

            res.status(200).json({ message: "Invoice deleted successfully" });
        } catch (err) {
            next(err);
        }
    }

    static async getUpcomingAlerts(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            const {type}=req.query
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const today = new Date();
            const threeDaysLater = new Date();
            threeDaysLater.setDate(today.getDate() + 3);

            const upcomingInvoices = await prisma.invoice.findMany({
                where: {
                    locationId: locationId,
                    status: 'pending',
                    invoiceType:type,
                    dueDate: {
                        gte: today,
                        lte: threeDaysLater
                    }
                },
                orderBy: { dueDate: 'asc' }
            });

            res.status(200).json(upcomingInvoices);
        } catch (err) {
            next(err);
        }
    }

    static async sendInvoiceEmail(req: any, res: Response, next: NextFunction) {
        try {
            const { emails, start_date, end_date, type } = req.body;
            const locationId = req.headers.location_id;

            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const whereClause: any = { locationId: locationId, invoiceType: type };
            if (start_date && end_date) {
                whereClause.invoiceDate = {
                    gte: new Date(start_date),
                    lte: new Date(end_date)
                };
            }

            const invoices = await prisma.invoice.findMany({
                where: whereClause,
                orderBy: { invoiceDate: 'desc' }
            });

            const emailList = emails.split(',').map((e: string) => e.trim()).filter((e: string) => e);
            if (emailList.length === 0) {
                res.status(400).json({ message: "No valid email addresses provided" });
                return;
            }

            // Generate PDF
            const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
                const doc = new PDFDocument({ margin: 50 });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Header
                doc.fontSize(20).font('Helvetica-Bold').text(`${type === 'general' ? 'Office' : 'Purchase'} Payment Report`, { align: 'center' });
                doc.moveDown();
                doc.fontSize(12).font('Helvetica').text(`Period: ${new Date(start_date).toLocaleDateString()} - ${new Date(end_date).toLocaleDateString()}`, { align: 'center' });
                doc.moveDown(2);

                // Table Header
                const tableTop = doc.y;
                const colPositions = [50, 130, 230, 320, 410, 500];
                const colWidths = [80, 100, 90, 90, 90, 60];
                const headers = ['Invoice #', 'Name', 'Amount', 'Invoice Date', 'Due Date', 'Status'];
                
                doc.fontSize(10).font('Helvetica-Bold');
                doc.text(headers[0], colPositions[0], tableTop, { width: colWidths[0], align: 'left' });
                doc.text(headers[1], colPositions[1], tableTop, { width: colWidths[1], align: 'left' });
                doc.text(headers[2], colPositions[2], tableTop, { width: colWidths[2], align: 'right' });
                doc.text(headers[3], colPositions[3], tableTop, { width: colWidths[3], align: 'center' });
                doc.text(headers[4], colPositions[4], tableTop, { width: colWidths[4], align: 'center' });
                doc.text(headers[5], colPositions[5], tableTop, { width: colWidths[5], align: 'left' });
                
                doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();
                doc.moveDown();

                // Table Rows
                doc.font('Helvetica').fontSize(9);
                invoices.forEach((inv) => {
                    if (doc.y > 700) {
                        doc.addPage();
                    }
                    
                    const rowY = doc.y;
                    doc.text(inv.invoiceNumber, colPositions[0], rowY, { width: colWidths[0], align: 'left' });
                    doc.text(inv.invoiceName.substring(0, 15), colPositions[1], rowY, { width: colWidths[1], align: 'left' });
                    doc.text(`₹${parseFloat(inv.amount.toString()).toFixed(2)}`, colPositions[2], rowY, { width: colWidths[2], align: 'right' });
                    doc.text(new Date(inv.invoiceDate).toLocaleDateString('en-GB'), colPositions[3], rowY, { width: colWidths[3], align: 'center' });
                    doc.text(new Date(inv.dueDate).toLocaleDateString('en-GB'), colPositions[4], rowY, { width: colWidths[4], align: 'center' });
                    doc.text(inv.status, colPositions[5], rowY, { width: colWidths[5], align: 'left' });
                    
                    doc.moveDown();
                });

                // Summary
                doc.moveDown();
                doc.fontSize(10).font('Helvetica-Bold');
                const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount.toString()), 0);
                doc.text(`Total Invoices: ${invoices.length}`, 50);
                doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 50);

                doc.end();
            });

            // Email content
            const reportType = type === 'general' ? 'Office Payment' : 'Purchase Payment';
            const emailBody = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>${reportType} Report</h2>
                    <p>Please find attached the ${reportType.toLowerCase()} report for the period:</p>
                    <p><strong>From:</strong> ${new Date(start_date).toLocaleDateString()}</p>
                    <p><strong>To:</strong> ${new Date(end_date).toLocaleDateString()}</p>
                    <p><strong>Total Invoices:</strong> ${invoices.length}</p>
                    <p>The detailed report is attached as a PDF file.</p>
                    <br/>
                    <p>Best regards,<br/>ABC Company</p>
                </div>
            `;

            // Send email: first as 'to', rest as 'bcc'
            const toEmail = emailList[0];
            const bccEmails = emailList.slice(1);

            const mailOptions: any = {
                from: '"ABC Company" <riplanit@gmail.com>',
                to: toEmail,
                subject: `${reportType} Report - ${new Date(start_date).toLocaleDateString()} to ${new Date(end_date).toLocaleDateString()}`,
                html: emailBody,
                attachments: [
                    {
                        filename: `${type}_payment_report_${new Date(start_date).toISOString().split('T')[0]}_to_${new Date(end_date).toISOString().split('T')[0]}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            };

            if (bccEmails.length > 0) {
                mailOptions.bcc = bccEmails.join(',');
            }

            await transporter.sendMail(mailOptions);

            res.status(200).json({ message: "Email sent successfully" });
        } catch (err) {
            next(err);
        }
    }
    // auto invoice
static async autoInvoice(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            const { supplier_id, amount, due_date, notes, invoiceType, invoice_name, frequency, tax_id, tax_percent, tax_amount } = req.body;

            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const newInvoice = await prisma.autoInvoice.create({
                data: {
                    invoiceName: invoice_name,
                    supplierId: supplier_id || null,
                    amount: amount,
                    dueDate: due_date,
                    notes: notes || null,
                    locationId: locationId,
                    invoiceType: invoiceType,
                    createdBy: req.user.id,
                    frequency: frequency,
                    taxId: tax_id || null,
                    taxPercent: tax_percent || null,
                    taxAmount: tax_amount || null
                }
            });

            res.status(201).json(newInvoice);
        } catch (err) {
            next(err);
        }
    }
    static async getAllAutoInvoices(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const invoices = await prisma.autoInvoice.findMany({
                where: { locationId: locationId },
                orderBy: { createdAt: 'desc' }
            });

            res.status(200).json(invoices);
        } catch (err) {
            next(err);
        }
    }
    static async updateAutoInvoiceStatus(req: any, res: Response, next: NextFunction) {
        try {
            const { invoiceId } = req.params;
            const { isDisable } = req.body;

            const updatedInvoice = await prisma.autoInvoice.update({
                where: { invoiceId: invoiceId },
                data: { isDisable: isDisable }
            });

            res.status(200).json(updatedInvoice);
        } catch (err) {
            next(err);
        }
    }
    static async updateAutoInvoiceDetail(req:any,res:Response,next:NextFunction){
        try {
            const { invoiceId } = req.params;
            const { invoiceName, supplier_id, amount, due_date, notes, invoiceType, frequency, tax_id, tax_percent, tax_amount } = req.body;
            const updatedInvoice = await prisma.autoInvoice.update({
                where: { invoiceId: invoiceId },
                data: {
                    invoiceName: invoiceName,
                    supplierId: supplier_id || null,
                    amount: amount,
                    dueDate: due_date,
                    notes: notes || null,
                    invoiceType: invoiceType,
                    frequency: frequency,
                    taxId: tax_id || null,
                    taxPercent: tax_percent || null,
                    taxAmount: tax_amount || null
                }
            }); 
            res.send(updatedInvoice)
        }catch(err){
            next(err)
        }

    }
    static async deleteAutoInvoice(req: any, res: Response, next: NextFunction) {
        try {
            const { invoiceId } = req.params;

            await prisma.autoInvoice.delete({
                where: { invoiceId: invoiceId }
            });

            res.status(200).json({ message: "Invoice deleted successfully" });
        } catch (err) {
            next(err);
        }
    }

    // ── CHECKIN INVOICE ──────────────────────────────────────────────────────
    static async finalizeCheckin(req: any, res: Response, next: NextFunction) {
        try {
            const { invoice_number, supplier_id, invoice_date, items } = req.body;
            const locationId = req.headers.location_id as string;
            const userId = req.user.id as string;

            if (!locationId) { res.status(400).json({ message: 'Location ID required' }); return; }
            if (!invoice_number?.trim()) { res.status(400).json({ message: 'Invoice number required' }); return; }
            if (!supplier_id) { res.status(400).json({ message: 'Supplier required' }); return; }
            if (!invoice_date) { res.status(400).json({ message: 'Invoice date required' }); return; }
            if (!Array.isArray(items) || items.length === 0) { res.status(400).json({ message: 'At least one item required' }); return; }

            // Duplicate check: same invoice_number + supplier + checkin type
            const duplicate = await prisma.invoice.findFirst({
                where: {
                    invoiceNumber: invoice_number.trim(),
                    supplierId: supplier_id,
                    invoiceType: 'checkin',
                    locationId,
                }
            });
            if (duplicate) { next({ message: 'Invoice already exists' }); return; }

            const result = await prisma.$transaction(async (tx) => {
                let totalQty = 0;
                let totalAmount = 0;
                let totalTax = 0;

                const processedItems: { item_id: string; quantity: number; rate: number; taxPercent: number; taxAmount: number; lineTotal: number; applyNewPrice: boolean; quantityType: string; notes: string }[] = [];

                for (const it of items) {
                    const item = await tx.itemMaster.findFirst({ where: { itemId: it.item_id, locationId } });
                    if (!item) throw new Error(`Item ${it.item_id} not found`);

                    const qty = Number(it.quantity);
                    const rate = Number(it.rate);
                    const taxPct = Number(it.tax_percent ?? item.taxPercent ?? 0);
                    const taxAmt = parseFloat(((rate * taxPct) / 100).toFixed(3));
                    const lineTotal = parseFloat((rate + taxAmt).toFixed(3)) * qty;

                    totalQty += qty;
                    totalAmount += rate * qty;
                    totalTax += taxAmt * qty;

                    processedItems.push({ item_id: it.item_id, quantity: qty, rate, taxPercent: taxPct, taxAmount: taxAmt, lineTotal, applyNewPrice: it.applyNewPrice !== false, quantityType: item.quantityType, notes: it.notes || '' });
                }

                const grandTotal = parseFloat((totalAmount + totalTax).toFixed(3));

                // Segregate tax by rate so a check-in with items on different tax
                // rates records each tax group separately on the invoice.
                const taxBreakdown = Object.values(
                    processedItems.reduce((groups: Record<string, { percent: number; base: number; tax: number; quantity: number }>, it) => {
                        const key = String(it.taxPercent);
                        const g = groups[key] || (groups[key] = { percent: it.taxPercent, base: 0, tax: 0, quantity: 0 });
                        g.base += it.rate * it.quantity;
                        g.tax += it.taxAmount * it.quantity;
                        g.quantity += it.quantity;
                        return groups;
                    }, {})
                )
                    .map((g) => ({
                        percent: g.percent,
                        base: parseFloat(g.base.toFixed(3)),
                        tax: parseFloat(g.tax.toFixed(3)),
                        total: parseFloat((g.base + g.tax).toFixed(3)),
                        quantity: parseFloat(g.quantity.toFixed(3)),
                    }))
                    .sort((a, b) => a.percent - b.percent);

                // Create checkin invoice record
                const invoice = await tx.invoice.create({
                    data: {
                        invoiceNumber: invoice_number.trim(),
                        invoiceName: `Checkin - ${invoice_number.trim()}`,
                        supplierId: supplier_id,
                        amount: parseFloat(totalAmount.toFixed(3)),
                        invoiceDate: new Date(invoice_date),
                        dueDate: new Date(invoice_date),
                        locationId,
                        createdBy: userId,
                        invoiceType: 'checkin',
                        status: 'paid',
                        taxAmount: parseFloat(totalTax.toFixed(3)),
                        totalQuantity: parseFloat(totalQty.toFixed(3)),
                        grandTotal,
                        taxBreakdown,
                    }
                });

                // Process each item: update stock + price history + transaction log
                for (const it of processedItems) {
                    const item = await tx.itemMaster.findFirst({ where: { itemId: it.item_id } });
                    if (!item) continue;

                    const newQty = Number(item.currentQty) + it.quantity;
                    const oldPrice = Number(item.purchasePrice);
                    const priceChanged = Math.abs(oldPrice - it.rate) > 0.001;

                    const updateData: { currentQty: number; purchasePrice?: number; totalAmount?: number } = { currentQty: newQty };

                    if (priceChanged && it.rate > 0 && it.applyNewPrice) {
                        updateData.purchasePrice = it.rate;
                        updateData.totalAmount = it.rate + it.taxAmount;

                        const existingHistory = await tx.itemPriceMaster.count({ where: { itemId: it.item_id } });
                        if (existingHistory === 0 && oldPrice > 0) {
                            await tx.itemPriceMaster.create({ data: { itemId: it.item_id, price: oldPrice } });
                        }
                        await tx.itemPriceMaster.create({ data: { itemId: it.item_id, price: it.rate } });
                    }

                    await tx.itemMaster.update({ where: { itemId: it.item_id }, data: updateData });

                    await tx.transactionLog.create({
                        data: {
                            itemId: it.item_id,
                            transactionType: 'checkin',
                            quantity: it.quantity,
                            quantityType: it.quantityType as any,
                            price: it.rate,
                            remainingQty: newQty,
                            takenById: userId,
                            remarks: `invoice:${invoice.invoiceId}`,
                        }
                    });
                }

                return { invoice, totalQty, totalAmount, totalTax, grandTotal, taxBreakdown };
            }, { maxWait: 15000, timeout: 120000 });

            // Create purchase invoice for Payment Tracker (outside main transaction so checkin is never rolled back)
            try {
                const dueDate = new Date(invoice_date);
                dueDate.setDate(dueDate.getDate() + 30);
                await prisma.invoice.create({
                    data: {
                        invoiceNumber: invoice_number.trim(),
                        invoiceName: `Checkin - ${invoice_number.trim()}`,
                        supplierId: supplier_id,
                        amount: parseFloat(result.totalAmount.toFixed(3)),
                        invoiceDate: new Date(invoice_date),
                        dueDate,
                        locationId,
                        createdBy: userId,
                        invoiceType: 'purchase',
                        status: 'pending',
                        taxAmount: parseFloat(result.totalTax.toFixed(3)),
                        totalQuantity: parseFloat(result.totalQty.toFixed(3)),
                        grandTotal: parseFloat(result.grandTotal.toFixed(3)),
                        taxBreakdown: result.taxBreakdown,
                    }
                });
            } catch (_) { /* purchase invoice already exists or failed — checkin still succeeds */ }

            res.status(201).json(result);
        } catch (err: any) {
            if (err.message?.startsWith('Item ')) { res.status(400).json({ message: err.message }); return; }
            next(err);
        }
    }

    static async backfillPurchaseInvoices(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id as string;
            const userId = req.user.id as string;

            if (!locationId) { res.status(400).json({ message: 'Location ID required' }); return; }

            // Get all checkin invoices for this location
            const checkinInvoices = await prisma.invoice.findMany({
                where: { locationId, invoiceType: 'checkin' }
            });

            let created = 0;
            let skipped = 0;

            for (const inv of checkinInvoices) {
                // Check if a purchase invoice already exists for this invoice number + supplier
                const exists = await prisma.invoice.findFirst({
                    where: {
                        invoiceNumber: inv.invoiceNumber,
                        supplierId: inv.supplierId,
                        invoiceType: 'purchase',
                        locationId,
                    }
                });

                if (exists) { skipped++; continue; }

                const dueDate = new Date(inv.invoiceDate);
                dueDate.setDate(dueDate.getDate() + 30);

                await prisma.invoice.create({
                    data: {
                        invoiceNumber: inv.invoiceNumber,
                        invoiceName: inv.invoiceName,
                        supplierId: inv.supplierId,
                        amount: inv.amount,
                        invoiceDate: inv.invoiceDate,
                        dueDate,
                        locationId,
                        createdBy: userId,
                        invoiceType: 'purchase',
                        status: 'pending',
                        taxAmount: inv.taxAmount,
                        totalQuantity: inv.totalQuantity,
                        grandTotal: inv.grandTotal,
                        taxBreakdown: inv.taxBreakdown ?? undefined,
                    }
                });
                created++;
            }

            res.status(200).json({ message: `Backfill complete: ${created} created, ${skipped} already existed` });
        } catch (err) {
            next(err);
        }
    }

    static async getCheckinInvoices(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id as string;
            const { startDate, endDate, supplierId } = req.query;

            if (!locationId) { res.status(400).json({ message: 'Location ID required' }); return; }

            const where: any = { locationId, invoiceType: 'checkin' };
            if (supplierId) where.supplierId = supplierId;
            if (startDate && endDate) {
                where.invoiceDate = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
            }

            const invoices = await prisma.invoice.findMany({
                where,
                orderBy: { invoiceDate: 'desc' },
            });

            // Attach supplier name and item breakdown
            const enriched = await Promise.all(invoices.map(async (inv) => {
                const supplier = inv.supplierId
                    ? await prisma.supplierMaster.findUnique({ where: { supplierId: inv.supplierId }, select: { supplierName: true } })
                    : null;

                const txLogs = await prisma.transactionLog.findMany({
                    where: { remarks: `invoice:${inv.invoiceId}` },
                    include: { item: { select: { itemName: true, itemCode: true, taxPercent: true, purchasePrice: true } } }
                });

                const lineItems = txLogs.map(t => ({
                    itemName: t.item.itemName,
                    itemCode: t.item.itemCode,
                    quantity: Number(t.quantity),
                    rate: Number(t.price),
                    taxPercent: Number(t.item.taxPercent ?? 0),
                    taxAmount: parseFloat(((Number(t.price) * Number(t.item.taxPercent ?? 0)) / 100 * Number(t.quantity)).toFixed(3)),
                    totalAmount: parseFloat((Number(t.price) * (1 + Number(t.item.taxPercent ?? 0) / 100) * Number(t.quantity)).toFixed(3)),
                }));

                // Prefer the tax breakdown persisted at check-in; fall back to
                // recomputing it from the transaction-log line items.
                const taxGroups = (inv.taxBreakdown as any[] | null) ?? Object.values(
                    lineItems.reduce((groups: Record<string, { percent: number; base: number; tax: number; quantity: number }>, li) => {
                        const key = String(li.taxPercent);
                        const g = groups[key] || (groups[key] = { percent: li.taxPercent, base: 0, tax: 0, quantity: 0 });
                        g.base += li.rate * li.quantity;
                        g.tax += li.taxAmount;
                        g.quantity += li.quantity;
                        return groups;
                    }, {})
                )
                    .map((g) => ({
                        percent: g.percent,
                        base: parseFloat(g.base.toFixed(3)),
                        tax: parseFloat(g.tax.toFixed(3)),
                        total: parseFloat((g.base + g.tax).toFixed(3)),
                        quantity: parseFloat(g.quantity.toFixed(3)),
                    }))
                    .sort((a, b) => a.percent - b.percent);

                return {
                    invoiceId: inv.invoiceId,
                    invoiceNumber: inv.invoiceNumber,
                    supplierName: supplier?.supplierName ?? '-',
                    invoiceDate: inv.invoiceDate,
                    totalQuantity: Number(inv.totalQuantity ?? 0),
                    totalAmount: Number(inv.amount),
                    totalTax: Number(inv.taxAmount ?? 0),
                    grandTotal: Number(inv.grandTotal ?? 0),
                    taxGroups,
                    lineItems,
                };
            }));

            res.status(200).json(enriched);
        } catch (err) {
            next(err);
        }
    }
}


