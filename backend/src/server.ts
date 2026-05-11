import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error.middleware';
import AuthRouter from './router/auth.router';
import LocationRouter from './router/location.router';
import UserRouter from './router/user.router';
import TaxRouter from './router/tax.router';
import CategoriesRouter from './router/categories.router';
import SupplierRouter from './router/supplier.router';
import ProductRouter from './router/product.router';
import ProductTransactionRouter from './router/product-transaction.router';
import ReportRouter from './router/report.router';
import InvoiceRouter from './router/invoice.router';
import DashboardRouter from './router/dashboard.router';
import { transporter } from './config/email.config';
import { startScheduler } from './services/scheduler.services';

const app = express();

app.use(express.json());

app.use(cors({
    credentials: true,
    origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://inventory-silk-kappa.vercel.app",
        "https://inventory-ilai.vercel.app/"
    ]
}));

app.get("/", (req, res) => {
    res.status(200).json({
        message: "Hello Welcome to our site"
    });
});

app.get("/mail-test", async (req, res) => {
    try {
        await transporter.sendMail({
            from: process.env.MAIL,
            to: process.env.MAIL,
            subject: "Test",
            text: "Test email"
        });
        res.send("Mail sent successfully");
    } catch (error: any) {
        console.error(error);
        res.status(500).send("Mail server error: " + error.message);
    }
});

app.use("/api/auth", AuthRouter);
app.use("/api/user", UserRouter);
app.use("/api/location", LocationRouter);
app.use("/api/tax", TaxRouter);
app.use("/api/categories", CategoriesRouter);
app.use("/api/supplier", SupplierRouter);
app.use("/api/item", ProductRouter);
app.use("/api/product", ProductTransactionRouter);
app.use("/api/report", ReportRouter);
app.use("/api/invoice", InvoiceRouter);
app.use("/api/dashboard", DashboardRouter);

app.use(errorHandler);

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    startScheduler();
    console.log('Scheduler started - Daily reports will be sent at 6 PM');
});