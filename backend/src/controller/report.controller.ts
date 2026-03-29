import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { qtyType } from "@prisma/client";

export class ReportController {
    static async getSummary(req: any, res: Response, next: NextFunction) {
        try {
            const { startDate, endDate, supplierId, categoryId } = req.query;
            const locationId = req.headers.location_id;

            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const whereClause: any = {
                item: { locationId: locationId }
            };

            if (supplierId) {
                whereClause.item.supplierId = supplierId;
            }

            if (categoryId) {
                whereClause.item.typeId = categoryId;
            }

            if (startDate && endDate) {
                whereClause.createdAt = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                };
            }

            const transactions = await prisma.transactionLog.findMany({
                where: whereClause,
                include: {
                    item: {
                        include: {
                            tax: true
                        }
                    }
                }
            });

            let totalCheckInAmount = 0;
            let totalCheckOutAmount = 0;
            let totalCheckInQty = 0;
            let totalCheckOutQty = 0;

            transactions.forEach(t => {
                const price = Number(t.price);
                const qty = Number(t.quantity);
                const taxPercent = Number(t.item.taxPercent || 0);
                const amount = price * qty;
                const taxAmount = (amount * taxPercent) / 100;
                const total = amount + taxAmount;

                if (t.transactionType === 'checkin') {
                    totalCheckInAmount += total;
                    totalCheckInQty += qty;
                } else {
                    totalCheckOutAmount += total;
                    totalCheckOutQty += qty;
                }
            });

            const revenue = totalCheckOutAmount - totalCheckInAmount;

            res.status(200).json({
                totalCheckInAmount,
                totalCheckOutAmount,
                revenue,
                totalTransactions: transactions.length,
                totalCheckInQty,
                totalCheckOutQty,
                totalQuantity: totalCheckInQty + totalCheckOutQty
            });
        } catch (err) {
            next(err);
        }
    }

    static async getList(req: any, res: Response, next: NextFunction) {
        try {
            const { startDate, endDate, page = 1, limit = 50, supplierId, categoryId } = req.query;
            const locationId = req.headers.location_id;

            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const whereClause: any = {
                item: { locationId: locationId }
            };

            if (supplierId) {
                whereClause.item.supplierId = supplierId;
            }

            if (categoryId) {
                whereClause.item.typeId = categoryId;
            }

            if (startDate && endDate) {
                whereClause.createdAt = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                };
            }

            const skip = (Number(page) - 1) * Number(limit);

            const [transactions, total] = await Promise.all([
                prisma.transactionLog.findMany({
                    where: whereClause,
                    include: {
                        item: {
                            include: {
                                location: true,
                                tax: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: Number(limit)
                }),
                prisma.transactionLog.count({ where: whereClause })
            ]);

            const formattedTransactions = transactions.map(t => {
                const price = Number(t.price);
                const qty = Number(t.quantity);
                const taxPercent = Number(t.item.taxPercent || 0);
                const amount = price * qty;
                const taxAmount = (amount * taxPercent) / 100;
                const total = amount + taxAmount;

                return {
                    transactionId: t.transactionId,
                    date: t.createdAt,
                    itemName: t.item.itemName,
                    itemCode: t.item.itemCode,
                    type: t.transactionType,
                    quantity: qty,
                    quantityType: t.quantityType,
                    price: price,
                    taxPercent: taxPercent,
                    taxAmount: taxAmount,
                    totalAmount: total,
                    location: t.item.location?.locationName,
                    takenBy: t.takenBy,
                    remarks: t.remarks
                };
            });

            res.status(200).json({
                transactions: formattedTransactions,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            });
        } catch (err) {
            next(err);
        }
    }

    static async getCharts(req: any, res: Response, next: NextFunction) {
        try {
            const { startDate, endDate, supplierId, categoryId } = req.query;
            const locationId = req.headers.location_id;

            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const whereClause: any = {
                item: { locationId: locationId }
            };

            if (supplierId) {
                whereClause.item.supplierId = supplierId;
            }

            if (categoryId) {
                whereClause.item.typeId = categoryId;
            }

            if (startDate && endDate) {
                whereClause.createdAt = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                };
            }

            const transactions = await prisma.transactionLog.findMany({
                where: whereClause,
                include: {
                    item: {
                        include: { tax: true }
                    }
                },
                orderBy: { createdAt: 'asc' }
            });

            // Daily totals
            const dailyData: any = {};
            transactions.forEach(t => {
                const date = new Date(t.createdAt).toISOString().split('T')[0];
                const price = Number(t.price);
                const qty = Number(t.quantity);
                const taxPercent = Number(t.item.taxPercent || 0);
                const amount = price * qty;
                const total = amount + (amount * taxPercent) / 100;

                if (!dailyData[date]) {
                    dailyData[date] = { date, checkIn: 0, checkOut: 0 };
                }

                if (t.transactionType === 'checkin') {
                    dailyData[date].checkIn += total;
                } else {
                    dailyData[date].checkOut += total;
                }
            });

            // Product totals - separate by check-in and check-out
            const checkInData: any = {};
            const checkOutData: any = {};
            transactions.forEach(t => {
                const itemName = t.item.itemName;
                const qty = Number(t.quantity);
                const qtyType = t.quantityType;

                if (t.transactionType === 'checkin') {
                    if (!checkInData[itemName]) {
                        checkInData[itemName] = { quantity: 0, quantityType: qtyType };
                    }
                    checkInData[itemName].quantity += qty;
                } else {
                    if (!checkOutData[itemName]) {
                        checkOutData[itemName] = { quantity: 0, quantityType: qtyType };
                    }
                    checkOutData[itemName].quantity += qty;
                }
            });

            const topCheckIn = Object.entries(checkInData)
                .map(([name, data]: [string, any]) => ({ name, quantity: data.quantity, quantityType: data.quantityType }))
                .sort((a: any, b: any) => b.quantity - a.quantity)
                .slice(0, 10);

            const topCheckOut = Object.entries(checkOutData)
                .map(([name, data]: [string, any]) => ({ name, quantity: data.quantity, quantityType: data.quantityType }))
                .sort((a: any, b: any) => b.quantity - a.quantity)
                .slice(0, 10);

            const productData: any = {};
            transactions.forEach(t => {
                const itemName = t.item.itemName;
                const qty = Number(t.quantity);
                const qtyType = t.quantityType;

                if (!productData[itemName]) {
                    productData[itemName] = { quantity: 0, quantityType: qtyType };
                }
                productData[itemName].quantity += qty;
            });

            const topProducts = Object.entries(productData)
                .map(([name, data]: [string, any]) => ({ name, quantity: data.quantity, quantityType: data.quantityType }))
                .sort((a: any, b: any) => b.quantity - a.quantity)
                .slice(0, 10);

            res.status(200).json({
                dailyTrend: Object.values(dailyData),
                topProducts,
                topCheckIn,
                topCheckOut
            });
        } catch (err) {
            next(err);
        }
    }

    static async getItemAnalysis(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const items = await prisma.itemMaster.findMany({
                where: { locationId },
                include: {
                    supplier: true,
                    type: true,
                    transactions: {
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    }
                }
            });

            const analysis = items.map(item => {
                const checkIns = item.transactions.filter(t => t.transactionType === 'checkin');
                const checkOuts = item.transactions.filter(t => t.transactionType === 'checkout');
                const totalCheckIn = checkIns.reduce((sum, t) => sum + Number(t.quantity), 0);
                const totalCheckOut = checkOuts.reduce((sum, t) => sum + Number(t.quantity), 0);
                const turnoverRate = totalCheckIn > 0 ? (totalCheckOut / totalCheckIn) * 100 : 0;

                return {
                    itemId: item.itemId,
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    currentQty: Number(item.currentQty),
                    rol: Number(item.rol),
                    moq: Number(item.moq),
                    eoq: Number(item.eoq),
                    totalCheckIn,
                    totalCheckOut,
                    turnoverRate: turnoverRate.toFixed(2),
                    supplier: item.supplier?.supplierName,
                    category: item.type?.typeName,
                    lastTransaction: item.transactions[0]?.createdAt,
                    purchasePrice: Number(item.purchasePrice || 0),
                    taxPercent: Number(item.taxPercent || 0)
                };
            });

            res.status(200).json(analysis);
        } catch (err) {
            next(err);
        }
    }

    static async getROLRecommendations(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const items = await prisma.itemMaster.findMany({
                where: { locationId },
                include: {
                    supplier: true,
                    transactions: {
                        where: { transactionType: 'checkout' },
                        orderBy: { createdAt: 'desc' },
                        take: 30
                    }
                }
            });

            const recommendations = items.map(item => {
                const currentQty = Number(item.currentQty);
                const rol = Number(item.rol);
                const moq = Number(item.moq);
                const eoq = Number(item.eoq);
                
                const last30Days = item.transactions.filter(t => {
                    const daysDiff = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                    return daysDiff <= 30;
                });
                
                const avgDailyUsage = last30Days.length > 0
                    ? last30Days.reduce((sum, t) => sum + Number(t.quantity), 0) / 30
                    : 0;
                
                const daysUntilStockout = avgDailyUsage > 0 ? currentQty / avgDailyUsage : 999;
                const recommendedROL = Math.ceil(avgDailyUsage * 7);
                const status = currentQty <= rol ? 'critical' : currentQty <= rol * 1.5 ? 'warning' : 'good';

                return {
                    itemId: item.itemId,
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    currentQty,
                    currentROL: rol,
                    recommendedROL,
                    moq,
                    eoq,
                    avgDailyUsage: avgDailyUsage.toFixed(2),
                    daysUntilStockout: daysUntilStockout.toFixed(1),
                    status,
                    supplier: item.supplier?.supplierName,
                    shouldReorder: currentQty <= rol
                };
            }).filter(r => r.status !== 'good' || r.shouldReorder);

            res.status(200).json(recommendations);
        } catch (err) {
            next(err);
        }
    }

    static async getSupplierPriceAnalysis(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            // Get all check-in transactions to analyze actual purchase prices
            const checkInTransactions = await prisma.transactionLog.findMany({
                where: { 
                    item: { locationId },
                    transactionType: 'checkin'
                },
                include: {
                    item: {
                        include: {
                            supplier: true,
                            type: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Group by item to get latest check-in price per pack
            const itemPriceMap: any = {};
            checkInTransactions.forEach(txn => {
                const itemId = txn.itemId;
                if (!itemPriceMap[itemId]) {
                    const packQty = Number(txn.item.packQty || 1);
                    const pricePerPack = Number(txn.item.purchasePrice);
                    
                    itemPriceMap[itemId] = {
                        itemId: txn.item.itemId,
                        itemCode: txn.item.itemCode,
                        itemName: txn.item.itemName,
                        supplier: txn.item.supplier?.supplierName || 'N/A',
                        supplierId: txn.item.supplierId,
                        category: txn.item.type?.typeName || 'Uncategorized',
                        packQty,
                        pricePerPack,
                        quantityType: txn.quantityType,
                        lastCheckInDate: txn.createdAt
                    };
                }
            });

            // Group by category for comparison
            const categoryMap: any = {};
            Object.values(itemPriceMap).forEach((item: any) => {
                const category = item.category;
                if (!categoryMap[category]) {
                    categoryMap[category] = [];
                }
                categoryMap[category].push(item);
            });

            // Calculate price comparison within each category
            const analysis: any[] = [];
            Object.entries(categoryMap).forEach(([category, items]: [string, any]) => {
                if (items.length > 1) {
                    const avgPrice = items.reduce((sum: number, i: any) => sum + i.pricePerPack, 0) / items.length;
                    const minPrice = Math.min(...items.map((i: any) => i.pricePerPack));
                    const maxPrice = Math.max(...items.map((i: any) => i.pricePerPack));
                    
                    items.forEach((item: any) => {
                        const priceDiff = ((item.pricePerPack - avgPrice) / avgPrice) * 100;
                        analysis.push({
                            ...item,
                            avgCategoryPrice: avgPrice.toFixed(2),
                            minCategoryPrice: minPrice.toFixed(2),
                            maxCategoryPrice: maxPrice.toFixed(2),
                            priceDiffPercent: priceDiff.toFixed(2),
                            priceStatus: priceDiff > 10 ? 'high' : priceDiff < -10 ? 'low' : 'average'
                        });
                    });
                }
            });

            res.status(200).json(analysis);
        } catch (err) {
            next(err);
        }
    }

    static async getDailyLog(req: any, res: Response, next: NextFunction) {
        try {
            const { date, type, itemId } = req.query;
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const targetDate = date ? new Date(date as string) : new Date();
            const startDate = new Date(targetDate.setHours(0, 0, 0, 0));
            const endDate = new Date(targetDate.setHours(23, 59, 59, 999));

            const whereClause: any = {
                item: { locationId },
                createdAt: { gte: startDate, lte: endDate }
            };

            if (type) whereClause.transactionType = type;
            if (itemId) whereClause.itemId = itemId;

            const logs = await prisma.transactionLog.findMany({
                where: whereClause,
                include: { item: true },
                orderBy: { createdAt: 'desc' }
            });

            res.status(200).json(logs);
        } catch (err) {
            next(err);
        }
    }

    static async getMonthlyLog(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const logs = await prisma.transactionLog.findMany({
                where: { item: { locationId } },
                include: { item: true }
            });

            const monthlyData: any = {};
            logs.forEach(log => {
                const month = new Date(log.createdAt).toISOString().slice(0, 7);
                if (!monthlyData[month]) {
                    monthlyData[month] = { month, checkIn: 0, checkOut: 0, totalQty: 0 };
                }
                const qty = Number(log.quantity);
                if (log.transactionType === 'checkin') {
                    monthlyData[month].checkIn += qty;
                } else {
                    monthlyData[month].checkOut += qty;
                }
                monthlyData[month].totalQty += qty;
            });

            res.status(200).json(Object.values(monthlyData));
        } catch (err) {
            next(err);
        }
    }

    static async getStockReport(req: any, res: Response, next: NextFunction) {
        try {
            const { status, supplierId, categoryId } = req.query;
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const whereClause: any = { locationId };
            if (supplierId) whereClause.supplierId = supplierId;
            if (categoryId) whereClause.typeId = categoryId;

            const items = await prisma.itemMaster.findMany({
                where: whereClause,
                include: { supplier: true, type: true }
            });

            let report = items.map(item => ({
                itemCode: item.itemCode,
                itemName: item.itemName,
                currentQty: Number(item.currentQty),
                purchasePrice: Number(item.purchasePrice),
                taxPercent: Number(item.taxPercent || 0),
                status: Number(item.currentQty) <= Number(item.rol) ? 'Low Stock' : 'In Stock',
                supplier: item.supplier?.supplierName,
                category: item.type?.typeName
            }));

            if (status) {
                report = report.filter(r => r.status === status);
            }

            res.status(200).json(report);
        } catch (err) {
            next(err);
        }
    }

    static async getHighConsumption(req: any, res: Response, next: NextFunction) {
        try {
            const { startDate, endDate, limit = 20 } = req.query;
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const whereClause: any = {
                item: { locationId },
                transactionType: 'checkout'
            };

            if (startDate && endDate) {
                whereClause.createdAt = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                };
            }

            const logs = await prisma.transactionLog.findMany({
                where: whereClause,
                include: { item: true }
            });

            const itemUsage: any = {};
            logs.forEach(log => {
                const itemId = log.itemId;
                if (!itemUsage[itemId]) {
                    itemUsage[itemId] = {
                        itemName: log.item.itemName,
                        itemCode: log.item.itemCode,
                        totalQty: 0,
                        frequency: 0
                    };
                }
                itemUsage[itemId].totalQty += Number(log.quantity);
                itemUsage[itemId].frequency += 1;
            });

            const sorted = Object.values(itemUsage).sort((a: any, b: any) => b.frequency - a.frequency).slice(0, Number(limit));
            res.status(200).json(sorted);
        } catch (err) {
            next(err);
        }
    }

    static async getLowConsumption(req: any, res: Response, next: NextFunction) {
        try {
            const { startDate, endDate, limit = 20 } = req.query;
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const whereClause: any = {
                item: { locationId },
                transactionType: 'checkout'
            };

            if (startDate && endDate) {
                whereClause.createdAt = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                };
            }

            const logs = await prisma.transactionLog.findMany({
                where: whereClause,
                include: { item: true }
            });

            const itemUsage: any = {};
            logs.forEach(log => {
                const itemId = log.itemId;
                if (!itemUsage[itemId]) {
                    itemUsage[itemId] = {
                        itemName: log.item.itemName,
                        itemCode: log.item.itemCode,
                        totalQty: 0,
                        frequency: 0
                    };
                }
                itemUsage[itemId].totalQty += Number(log.quantity);
                itemUsage[itemId].frequency += 1;
            });

            const sorted = Object.values(itemUsage).sort((a: any, b: any) => a.frequency - b.frequency).slice(0, Number(limit));
            res.status(200).json(sorted);
        } catch (err) {
            next(err);
        }
    }

    static async getPredictiveAnalytics(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const items = await prisma.itemMaster.findMany({
                where: { locationId },
                include: {
                    transactions: {
                        where: { transactionType: 'checkout' },
                        orderBy: { createdAt: 'desc' },
                        take: 90
                    }
                }
            });

            const predictions = items.map(item => {
                const transactions = item.transactions;
                if (transactions.length < 7) return null;

                const last30Days = transactions.filter(t => {
                    const daysDiff = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                    return daysDiff <= 30;
                });

                const last60Days = transactions.filter(t => {
                    const daysDiff = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                    return daysDiff <= 60 && daysDiff > 30;
                });

                const avg30 = last30Days.length > 0 ? last30Days.reduce((sum, t) => sum + Number(t.quantity), 0) / 30 : 0;
                const avg60 = last60Days.length > 0 ? last60Days.reduce((sum, t) => sum + Number(t.quantity), 0) / 30 : 0;

                const trend = avg30 > avg60 ? 'increasing' : avg30 < avg60 ? 'decreasing' : 'stable';
                const trendPercent = avg60 > 0 ? ((avg30 - avg60) / avg60) * 100 : 0;

                const currentQty = Number(item.currentQty);
                const predictedDaysToStockout = avg30 > 0 ? currentQty / avg30 : 999;
                const predictedStockoutDate = new Date(Date.now() + predictedDaysToStockout * 24 * 60 * 60 * 1000);

                return {
                    itemId: item.itemId,
                    itemName: item.itemName,
                    itemCode: item.itemCode,
                    currentQty,
                    avgDailyUsage: avg30.toFixed(2),
                    trend,
                    trendPercent: trendPercent.toFixed(2),
                    predictedDaysToStockout: predictedDaysToStockout.toFixed(1),
                    predictedStockoutDate: predictedDaysToStockout < 999 ? predictedStockoutDate.toISOString().split('T')[0] : 'N/A',
                    urgency: predictedDaysToStockout < 7 ? 'critical' : predictedDaysToStockout < 14 ? 'high' : predictedDaysToStockout < 30 ? 'medium' : 'low'
                };
            }).filter(p => p !== null);

            res.status(200).json(predictions);
        } catch (err) {
            next(err);
        }
    }

    static async getABCAnalysis(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const items = await prisma.itemMaster.findMany({
                where: { locationId },
                include: {
                    transactions: {
                        where: { transactionType: 'checkout' }
                    }
                }
            });

            const itemValues = items.map(item => {
                const totalQty = item.transactions.reduce((sum, t) => sum + Number(t.quantity), 0);
                const value = totalQty * Number(item.purchasePrice);
                return {
                    itemId: item.itemId,
                    itemName: item.itemName,
                    itemCode: item.itemCode,
                    totalQty,
                    unitPrice: Number(item.purchasePrice),
                    totalValue: value,
                    frequency: item.transactions.length
                };
            }).sort((a, b) => b.totalValue - a.totalValue);

            const totalValue = itemValues.reduce((sum, i) => sum + i.totalValue, 0);
            let cumulativeValue = 0;
            const classified = itemValues.map(item => {
                cumulativeValue += item.totalValue;
                const cumulativePercent = (cumulativeValue / totalValue) * 100;
                const category = cumulativePercent <= 80 ? 'A' : cumulativePercent <= 95 ? 'B' : 'C';
                return {
                    ...item,
                    category,
                    valuePercent: ((item.totalValue / totalValue) * 100).toFixed(2),
                    cumulativePercent: cumulativePercent.toFixed(2)
                };
            });

            res.status(200).json(classified);
        } catch (err) {
            next(err);
        }
    }

    static async getSeasonalTrends(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const logs = await prisma.transactionLog.findMany({
                where: {
                    item: { locationId },
                    transactionType: 'checkout'
                },
                include: { item: true }
            });

            const monthlyData: any = {};
            logs.forEach(log => {
                const date = new Date(log.createdAt);
                const month = date.getMonth() + 1;
                const itemId = log.itemId;
                const key = `${itemId}-${month}`;

                if (!monthlyData[key]) {
                    monthlyData[key] = {
                        itemId,
                        itemName: log.item.itemName,
                        month,
                        totalQty: 0,
                        occurrences: 0
                    };
                }
                monthlyData[key].totalQty += Number(log.quantity);
                monthlyData[key].occurrences += 1;
            });

            const trends = Object.values(monthlyData).map((data: any) => ({
                ...data,
                avgQty: (data.totalQty / data.occurrences).toFixed(2)
            }));

            res.status(200).json(trends);
        } catch (err) {
            next(err);
        }
    }

    static async getSmartInsights(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const items = await prisma.itemMaster.findMany({
                where: { locationId },
                include: {
                    transactions: { orderBy: { createdAt: 'desc' }, take: 30 }
                }
            });

            const insights: any[] = [];

            items.forEach(item => {
                const currentQty = Number(item.currentQty);
                const rol = Number(item.rol);

                if (currentQty <= rol) {
                    insights.push({
                        type: 'alert',
                        severity: 'high',
                        message: `${item.itemName} is below ROL. Current: ${currentQty}, ROL: ${rol}`,
                        itemId: item.itemId,
                        action: 'Reorder immediately'
                    });
                }

                if (item.transactions.length === 0) {
                    insights.push({
                        type: 'warning',
                        severity: 'medium',
                        message: `${item.itemName} has no recent activity`,
                        itemId: item.itemId,
                        action: 'Review if item is still needed'
                    });
                }

                const last7Days = item.transactions.filter(t => {
                    const daysDiff = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                    return daysDiff <= 7;
                });

                if (last7Days.length > 10) {
                    insights.push({
                        type: 'info',
                        severity: 'low',
                        message: `${item.itemName} has high activity (${last7Days.length} transactions in 7 days)`,
                        itemId: item.itemId,
                        action: 'Consider increasing stock levels'
                    });
                }
            });

            res.status(200).json(insights);
        } catch (err) {
            next(err);
        }
    }

    static async getGroupedProducts(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return; 
            }

            const items = await prisma.itemMaster.findMany({
                where: { 
                    locationId, 
                    groupName: { not: null },
                    isDisable: false
                },
                include: { type: true, supplier: true, group: true }
            });

            if (items.length === 0) {
                res.status(200).json({ groups: [], totalInventoryWorth: "0.00" });
                return;
            }

            const convertToBaseUnit = (quantity: number, unit: string): { value: number; baseUnit: string } => {
                const lowerUnit = unit?.toLowerCase().trim() || '';
                if (lowerUnit === 'gram' || lowerUnit === 'grams' || lowerUnit === 'g') {
                    return { value: quantity / 1000, baseUnit: 'kg' };
                } else if (lowerUnit === 'kilogram' || lowerUnit === 'kg') {
                    return { value: quantity, baseUnit: 'kg' };
                } else if (lowerUnit === 'milliliter' || lowerUnit === 'ml') {
                    return { value: quantity / 1000, baseUnit: 'L' };
                } else if (lowerUnit === 'liter' || lowerUnit === 'l') {
                    return { value: quantity, baseUnit: 'L' };
                }
                return { value: quantity, baseUnit: unit || 'units' };
            };

            const grouped: any = {};
            let totalInventoryWorth = 0;

            items.forEach(item => {
                const groupId = item.groupName as string;
                const groupName = item.group?.typeName || 'Ungrouped';
                
                if (!grouped[groupId]) {
                    grouped[groupId] = {
                        groupId,
                        groupName,
                        totalQty: 0,
                        qtyType: '',
                        totalWorth: 0,
                        items: []
                    };
                }
                
                const packQty = Number(item.packQty || 1);
                const currentQty = Number(item.currentQty || 0);
                const purchasePrice = Number(item.purchasePrice || 0);
                const itemTotalQty = packQty * currentQty;
                const itemWorth = itemTotalQty * purchasePrice;
                
                const converted = convertToBaseUnit(itemTotalQty, item.quantityType);
                
                if (!grouped[groupId].qtyType) {
                    grouped[groupId].qtyType = converted.baseUnit;
                }
                
                grouped[groupId].totalQty += converted.value;
                grouped[groupId].totalWorth += itemWorth;
                totalInventoryWorth += itemWorth;
                
                grouped[groupId].items.push({
                    itemId: item.itemId,
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    packQty,
                    currentQty,
                    totalQty: itemTotalQty,
                    quantityType: item.quantityType || 'units',
                    qtyType:item.quantityType,
                    purchasePrice,
                    itemWorth,
                    supplier: item.supplier?.supplierName,
                    category: item.type?.typeName
                });
            });
            
            res.status(200).json({
                groups: Object.values(grouped),
                totalInventoryWorth: totalInventoryWorth.toFixed(2)
            });
        } catch (err) {
            next(err);
        }
    }

    static async getPriceChangeReport(req: any, res: Response, next: NextFunction) {
        try {
            const { startDate, endDate, itemId } = req.query;
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            // Fetch ALL price history for items in this location (no date filter here).
            // Date filtering is applied to the *pair* level (when the new price was recorded),
            // so the old price entry — which may predate the range — is always available.
            const itemFilter: any = { locationId, isDisable: false };
            if (itemId) itemFilter.itemId = itemId as string;

            const history = await prisma.itemPriceMaster.findMany({
                where: { item: itemFilter },
                include: { item: { include: { supplier: true, type: true } } },
                orderBy: { createdAt: 'desc' },
            });

            // Group by item (entries already desc by createdAt)
            const itemMap = new Map<string, typeof history>();
            history.forEach(h => {
                const arr = itemMap.get(h.itemId) ?? [];
                arr.push(h);
                itemMap.set(h.itemId, arr);
            });

            const rangeStart = startDate ? new Date(startDate as string) : null;
            const rangeEnd   = endDate   ? new Date(endDate   as string) : null;

            const rows: any[] = [];
            itemMap.forEach((entries) => {
                // Handle items with only 1 price history entry:
                // The single entry IS the new price; the item's current purchasePrice
                // equals it (already updated), so we can't recover the old price here.
                // These will be shown with oldPrice = 0 / percentChange = null.
                if (entries.length === 1) {
                    const entry = entries[0];
                    const changedOn = new Date(entry.createdAt);
                    if (rangeStart && changedOn < rangeStart) return;
                    if (rangeEnd   && changedOn > rangeEnd)   return;
                    const newPrice = Number(entry.price);
                    rows.push({
                        itemId:        entry.itemId,
                        itemCode:      entry.item.itemCode,
                        itemName:      entry.item.itemName,
                        supplier:      entry.item.supplier?.supplierName ?? '-',
                        category:      entry.item.type?.typeName ?? '-',
                        oldPrice:      0,
                        newPrice,
                        difference:    newPrice,
                        percentChange: null,
                        changedOn:     entry.createdAt,
                        direction:     'increased',
                    });
                    return;
                }

                for (let i = 0; i < entries.length - 1; i++) {
                    const newEntry = entries[i];       // more recent
                    const oldEntry = entries[i + 1];   // previous

                    // Apply date filter to the change event (newEntry.createdAt)
                    const changedOn = new Date(newEntry.createdAt);
                    if (rangeStart && changedOn < rangeStart) continue;
                    if (rangeEnd   && changedOn > rangeEnd)   continue;

                    const oldPrice = Number(oldEntry.price);
                    const newPrice = Number(newEntry.price);
                    const diff     = newPrice - oldPrice;
                    const pctChange = oldPrice > 0
                        ? parseFloat(((diff / oldPrice) * 100).toFixed(2))
                        : null;   // null when old price was 0 — rendered as "N/A" on frontend

                    rows.push({
                        itemId:        newEntry.itemId,
                        itemCode:      newEntry.item.itemCode,
                        itemName:      newEntry.item.itemName,
                        supplier:      newEntry.item.supplier?.supplierName ?? '-',
                        category:      newEntry.item.type?.typeName ?? '-',
                        oldPrice,
                        newPrice,
                        difference:    parseFloat(diff.toFixed(2)),
                        percentChange: pctChange,
                        changedOn:     newEntry.createdAt,
                        direction:     diff > 0 ? 'increased' : diff < 0 ? 'decreased' : 'unchanged',
                    });
                }
            });

            rows.sort((a, b) => new Date(b.changedOn).getTime() - new Date(a.changedOn).getTime());
            res.status(200).json(rows);
        } catch (err) {
            next(err);
        }
    }

    static async getTransactionAnalysis(req: any, res: Response, next: NextFunction) {
        try {
            const { startDate, endDate } = req.query;
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const whereClause: any = { item: { locationId } };
            if (startDate && endDate) {
                whereClause.createdAt = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                };
            }

            const transactions = await prisma.transactionLog.findMany({
                where: whereClause,
                include: { item: true }
            });

            const hourlyData: any = {};
            const userActivity: any = {};
            let totalCheckIn = 0, totalCheckOut = 0;

            transactions.forEach(t => {
                const hour = new Date(t.createdAt).getHours();
                if (!hourlyData[hour]) hourlyData[hour] = { hour, checkIn: 0, checkOut: 0, count: 0 };
                
                const qty = Number(t.quantity);
                if (t.transactionType === 'checkin') {
                    hourlyData[hour].checkIn += qty;
                    totalCheckIn += qty;
                } else {
                    hourlyData[hour].checkOut += qty;
                    totalCheckOut += qty;
                }
                hourlyData[hour].count += 1;

                const user = t.takenBy || 'Unknown';
                if (!userActivity[user]) userActivity[user] = { user, checkIn: 0, checkOut: 0, total: 0 };
                if (t.transactionType === 'checkin') {
                    userActivity[user].checkIn += 1;
                } else {
                    userActivity[user].checkOut += 1;
                }
                userActivity[user].total += 1;
            });

            const peakHour = Object.values(hourlyData).sort((a: any, b: any) => b.count - a.count)[0] as any;
            const topUser = Object.values(userActivity).sort((a: any, b: any) => b.total - a.total)[0] as any;

            res.status(200).json({
                summary: {
                    totalTransactions: transactions.length,
                    totalCheckIn,
                    totalCheckOut,
                    avgPerDay: (transactions.length / 30).toFixed(2),
                    peakHour: peakHour ? `${peakHour.hour}:00` : 'N/A',
                    peakHourCount: peakHour?.count || 0
                },
                hourlyPattern: Object.values(hourlyData).sort((a: any, b: any) => a.hour - b.hour),
                userActivity: Object.values(userActivity).sort((a: any, b: any) => b.total - a.total),
                topUser: topUser?.user || 'N/A'
            });
        } catch (err) {
            next(err);
        }
    }
}
