import cron from "node-cron";
import ExcelJS from "exceljs";
import { prisma } from "../lib/prisma";
import { transporter, mailGenerator } from "../config/email.config";

const company_name = "ABC Company";

export const startScheduler = () => {
  // Runs every day at 6 PM
  cron.schedule("0 18 * * *", async () => {
    console.log("Running daily report scheduler...");
    await sendDailyReport();
  });
  cron.schedule("0 6 * * *", async () => {
    console.log("Running daily morning scheduler...");
    const data = await prisma.autoInvoice.findMany({
      where: {
        frequency: 'daily',
        isDisable: false,
      }
    })
    
 console.log(data)
 data.map((datax)=>{
  createInvoice(datax)

 })   
  });
  cron.schedule("0 6 * * 1", async () => {
    console.log("Running monday morning scheduler...");
    const data = await prisma.autoInvoice.findMany({
      where: {
        frequency: 'weekly',
        isDisable: false
      }
    })
    data.map((datax)=>{
      createInvoice(datax)

    })
    
  });
  cron.schedule("0 6 1 * *", async () => {
    console.log("Running month day1 morning scheduler...");
    const data = await prisma.autoInvoice.findMany({
      where: {
        frequency: 'monthly',
        isDisable: false
      }
    })
    data.map((datax)=>{
      createInvoice(datax)
    })
    
  });
  cron.schedule("0 6 1 1 *", async () => {
    console.log("Running month day1 morning scheduler...");
    const data = await prisma.autoInvoice.findMany({
      where: {
        frequency: 'yearly',
        isDisable: false
      }
    })
    data.map((datax)=>{
      createInvoice(datax)
    })
    
  });
};

const createInvoice = async (data: any) => {
  try {
    const date = new Date()
    const invoiceNumber = await generateNextInvoiceNumber(data.invoiceType)
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceName: data.invoiceName,
        amount: data.amount,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + Number(data.dueDate) * 24 * 60 * 60 * 1000),
        status: 'pending',
        notes: data.notes,
        createdBy: data.createdBy,
        locationId: data.locationId,
        supplierId: data.supplierId || null,
        invoiceType: data.invoiceType || null
      }
    })
    console.log(invoice)
    return invoice
  } catch (err) {
    console.log(err)
  }
}
const sendDailyReport = async () => {
  try {
    // Fetch users with email notifications enabled (admin and analyzer)
    const users = await prisma.user.findMany({
      where: {
        emailNotification: true,
        isActive: true,
        role: { in: ["admin", "analyzer"] },
      },
      select: { email: true, fullName: true },
    });

    if (users.length === 0) {
      console.log("No users with email notifications enabled");
      return;
    }

    // Generate Excel file
    const excelBuffer = await generateDailyReportExcel();

    // Send email to all users using BCC
    await sendEmailWithAttachment(users, excelBuffer);

    console.log("Daily reports sent successfully");
  } catch (error) {
    console.error("Error sending daily report:", error);
  }
};

const generateDailyReportExcel = async (): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();

  // Today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Sheet 1: Today's Transactions
  const transactionsSheet = workbook.addWorksheet("Today Transactions");
  const transactions = await prisma.transactionLog.findMany({
    where: {
      createdAt: { gte: today, lt: tomorrow },
    },
    include: {
      item: { include: { location: true, supplier: true } },
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });
  console.log(transactions)

  transactionsSheet.columns = [
    { header: "Transaction ID", key: "transactionId", width: 30 },
    { header: "Item Code", key: "itemCode", width: 15 },
    { header: "Item Name", key: "itemName", width: 25 },
    { header: "Location", key: "location", width: 20 },
    { header: "Type", key: "type", width: 12 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Remaining Qty", key: "remainingQty", width: 15 },
    { header: "Taken By", key: "takenBy", width: 20 },
    { header: "Remarks", key: "remarks", width: 30 },
    { header: "Date", key: "date", width: 20 },
  ];

  transactions.forEach((t) => {
    transactionsSheet.addRow({
      transactionId: t.transactionId,
      itemCode: t.item.itemCode,
      itemName: t.item.itemName,
      location: t.item.location.locationName,
      type: t.transactionType,
      quantity: t.quantity.toString(),
      remainingQty: t.remainingQty.toString(),
      takenBy: t.user?.fullName || t.takenBy || "N/A",
      remarks: t.remarks || "",
      date: t.createdAt.toLocaleString(),
    });
  });

  styleSheet(transactionsSheet);

  // Sheet 2: ROL (Reorder Level) Items
  const rolSheet = workbook.addWorksheet("ROL Items");
  const rolItems = await prisma.itemMaster.findMany({
    where: {
      currentQty: { lte: prisma.itemMaster.fields.rol },
    },
    include: {
      location: true,
      supplier: true,
      type: true,
    },
    orderBy: { currentQty: "asc" },
  });

  rolSheet.columns = [
    { header: "Item Code", key: "itemCode", width: 15 },
    { header: "Item Name", key: "itemName", width: 25 },
    { header: "Location", key: "location", width: 20 },
    { header: "Current Qty", key: "currentQty", width: 15 },
    { header: "ROL", key: "rol", width: 12 },
    { header: "MOQ", key: "moq", width: 12 },
    { header: "Supplier", key: "supplier", width: 25 },
    { header: "Type", key: "type", width: 15 },
    { header: "Last Purchase", key: "lastPurchase", width: 20 },
  ];

  rolItems.forEach((item) => {
    rolSheet.addRow({
      itemCode: item.itemCode,
      itemName: item.itemName,
      location: item.location.locationName,
      currentQty: item.currentQty.toString(),
      rol: item.rol.toString(),
      moq: item.moq?.toString() || "N/A",
      supplier: item.supplier?.supplierName || "N/A",
      type: item.type?.typeName || "N/A",
      lastPurchase: item.lastPurchaseDate?.toLocaleDateString() || "N/A",
    });
  });

  styleSheet(rolSheet);

  // Sheet 3: Upcoming Pending Invoices
  const invoicesSheet = workbook.addWorksheet("Upcoming Pending Invoices");
  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 30); // Next 30 days

  const invoices = await prisma.invoice.findMany({
    where: {
      status: "pending",
      dueDate: { gte: today, lte: upcomingDate },
    },
    orderBy: { dueDate: "asc" },
  });

  invoicesSheet.columns = [
    { header: "Invoice Number", key: "invoiceNumber", width: 20 },
    { header: "Invoice Name", key: "invoiceName", width: 30 },
    { header: "Amount", key: "amount", width: 15 },
    { header: "Invoice Date", key: "invoiceDate", width: 15 },
    { header: "Due Date", key: "dueDate", width: 15 },
    { header: "Days Until Due", key: "daysUntilDue", width: 15 },
    { header: "Status", key: "status", width: 12 },
    { header: "Notes", key: "notes", width: 30 },
  ];

  invoices.forEach((inv) => {
    const daysUntilDue = Math.ceil(
      (inv.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    invoicesSheet.addRow({
      invoiceNumber: inv.invoiceNumber,
      invoiceName: inv.invoiceName,
      amount: inv.amount.toString(),
      invoiceDate: inv.invoiceDate.toLocaleDateString(),
      dueDate: inv.dueDate.toLocaleDateString(),
      daysUntilDue: daysUntilDue.toString(),
      status: inv.status,
      notes: inv.notes || "",
    });
  });

  styleSheet(invoicesSheet);

  return Buffer.from(await workbook.xlsx.writeBuffer());
};

const styleSheet = (sheet: ExcelJS.Worksheet) => {
  // Style header row
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
};

const sendEmailWithAttachment = async (
  users: { email: string; fullName: string }[],
  excelBuffer: Buffer
): Promise<boolean> => {
  const today = new Date().toLocaleDateString();
  const template = {
    body: {
      name: "Team",
      intro: `Here is your daily inventory report for ${today}.`,
      table: {
        data: [
          { item: "Today's Transactions", description: "All transactions recorded today" },
          { item: "ROL Items", description: "Items at or below reorder level" },
          { item: "Upcoming Invoices", description: "Pending invoices due in next 30 days" },
        ],
      },
      outro: "Please find the detailed report in the attached Excel file.",
    },
  };

  const mail = mailGenerator.generate(template);
  const message: any = {
    from: `"${company_name}" <riplanit@gmail.com>`,
    to: users[0].email,
    subject: `Daily Inventory Report - ${today}`,
    html: mail,
    attachments: [
      {
        filename: `Daily_Report_${today.replace(/\//g, "-")}.xlsx`,
        content: excelBuffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  };
  if (users.length > 1) {
    message.bcc = users.slice(1).map((u) => u.email);
  }
  try {
    await transporter.sendMail(message);
    console.log(`Successfully sent daily report to ${users.length} users via BCC`);
    return true;
  } catch (error) {
    console.error(`Failed to send email:`, error);
    return false;
  }
};



export const generateNextInvoiceNumber = async (type:'general'|'purchase'): Promise<string> => {
  const allInvoices = await prisma.invoice.findMany({
    where:{invoiceType:type},
    select: { invoiceNumber: true }
  });

  if (allInvoices.length === 0) return 'INV1001';

  let maxNum = 0;
  let prefix = 'INV';

  allInvoices.forEach(({ invoiceNumber }) => {
    const match = invoiceNumber.trim().match(/^([A-Za-z]*)(\d+)$/);
    if (match) {
      const num = parseInt(match[2], 10);
      if (num > maxNum) {
        maxNum = num;
        prefix = match[1];
      }
    }
  });

  return `${prefix}${maxNum + 1}`;
};
