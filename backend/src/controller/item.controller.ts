import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import QRCode from "qrcode";

interface BulkItemInput {
    item_code: string;
    item_name: string;
    location_id: string;
    type_id?: string;
    supplier_id?: string;
    tax_id?: string;
    purchase_price: number;
    tax_percent?: number;
    current_qty?: number;
    quantityType?: string;
    rol?: number;
    moq?: number;
    eoq?: number;
    defaultIncrease?: number;
    defaultDecrease?: number;
    packQty?: number;
    groupName?: string;
}

export class ItemController {
    static async addItem(req: Request, res: Response, next: NextFunction) {
        try {
            const { item_code, item_name, location_id, current_qty, barcode, supplier_id, type_id, tax_id, purchase_price, tax_percent, rol, moq, eoq,quantityType,defaultIncrease,defaultDecrease,packQty,packCount,groupName } = req.body;
            
            const existingItem = await prisma.itemMaster.findFirst({
                where: {
                    itemCode: item_code,
                    locationId: location_id
                }
            });

            if (existingItem) {
                res.status(400).json({ message: "Item code already exists in this location" });
                return;
            }

            const total_amount = purchase_price + ((purchase_price * tax_percent) / 100);
            const item = await prisma.itemMaster.create({
                data: {
                    itemCode: item_code,
                    itemName: item_name,
                    locationId: location_id,
                    currentQty: current_qty,
                    barcode: barcode,
                    supplierId: supplier_id,
                    typeId: type_id,
                    taxId: tax_id,
                    purchasePrice: purchase_price,
                    taxPercent: tax_percent,
                    totalAmount: total_amount,
                    rol: rol,
                    moq: moq,
                    eoq: eoq,
                    quantityType,
                    defaultIncrease,
                    defaultDecrease,
                    packQty,
                    groupName
                }
            });

            await prisma.itemPriceMaster.create({
                data: {
                    itemId: item.itemId,
                    price: purchase_price,
                    createdAt: new Date()
                }
            });

            res.status(201).json({ item });
        } catch (err) {
            next(err);
        }
    }
    static async getAllItem(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }
            
            const items = await prisma.itemMaster.findMany({
                where: {
                    locationId: locationId,
                    isDisable:false
                }, include: {
                    location: true,
                    supplier: true,
                    type: true,
                    tax: true,
                    group: true
                },
                orderBy:{
                    itemCode:'asc'
                }
            })
            res.status(200).json(items)
        } catch (err) {
            next(err)
        }
    }

    static async getItemById(req: any, res: Response, next: NextFunction) {
        try {
             const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }
            const id = req.params.itemId;
            const items = await prisma.itemMaster.findMany({
                where: {
                    locationId:locationId,
                    itemId: id,
                    isDisable:false
                }, include: {
                    location: true,
                    supplier: true,
                    type: true,
                    tax: true
                }

            })
            console.log(items)
            res.status(200).json(items)
        } catch (err) {
            next(err)
        }
    }

    static async getItemByBarcode(req: any, res: Response, next: NextFunction) {
        try {
            const barcode = req.params.barcode;
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }
            const item = await prisma.itemMaster.findFirst({
                where: {
                    locationId: locationId,
                    barcode: barcode,
                    isDisable:false
                },
                include: {
                    location: true,
                    supplier: true,
                    type: true,
                    tax: true
                }
            })
            res.status(200).json(item)
        } catch (err) {
            next(err)
        }
    }

    static async getItemByCode(req: any, res: Response, next: NextFunction) {
        try {
            const itemCode = req.params.itemCode;
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }
            const item = await prisma.itemMaster.findFirst({
                where: {
                    locationId: locationId,
                    itemCode: itemCode,
                    isDisable:false,
                },
                include: {
                    location: true,
                    supplier: true,
                    type: true,
                    tax: true
                }
            })
            res.status(200).json(item)
        } catch (err) {
            next(err)
        }
    }
    static async updateItem(req: any, res: Response, next: NextFunction) {
        try {
            const id = req.params.itemId;
            const { item_code, item_name, location_id, current_qty, barcode, supplier_id, type_id, tax_id, purchase_price, tax_percent,packQty,groupName } = req.body;
             const { rol, moq, eoq,defaultDecrease,defaultIncrease,quantityType } = req.body;

            const total_amount = purchase_price + (purchase_price * tax_percent) / 100;
            
            const existingItem = await prisma.itemMaster.findUnique({
                where: { itemId: id }
            });

            // Check for duplicate item code in same location (exclude current item)
            if (item_code && location_id) {
                const duplicate = await prisma.itemMaster.findFirst({
                    where: {
                        itemCode: item_code,
                        locationId: location_id,
                        itemId: { not: id }
                    }
                });
                if (duplicate) {
                    res.status(400).json({ message: `Item code "${item_code}" already exists in this location` });
                    return;
                }
            }

            // Only create price history if price actually changed
            if (existingItem && Number(existingItem.purchasePrice) !== Number(purchase_price)) {
                await prisma.itemPriceMaster.create({
                    data: {
                        itemId: id,
                        price: purchase_price,
                        createdAt: new Date()
                    }
                });
            }

            const item = await prisma.itemMaster.update({
                where: {
                    itemId: id,
                    isDisable:false
                },
                data: {
                    itemCode: item_code,
                    itemName: item_name,
                    locationId: location_id,
                    barcode: barcode,
                    supplierId: supplier_id,
                    typeId: type_id,
                    taxId: tax_id,
                    purchasePrice: purchase_price,
                    taxPercent: tax_percent,
                    totalAmount: total_amount,
                    rol: rol,
                    moq: moq,
                    eoq: eoq,
                    quantityType,
                    defaultIncrease,
                    defaultDecrease,
                    packQty,
                    groupName, 
                    currentQty:current_qty

                }
            });
            res.status(200).json(item);
        } catch (err) {
            next(err)
        }
    }
 
    static async deleteItem(req: any, res: Response, next: NextFunction) {
        try {
            const id = req.params.itemId as string;
            const item = await prisma.itemMaster.update({
                where: {
                    itemId: id,
                    isDisable:false
                },
                data:{
                    isDisable:true
                }
            })
            res.status(200).json(item)
        } catch (err) {
            next(err)
        }
    }

    static async getItemPriceHistory(req: any, res: Response, next: NextFunction) {
        try {
            const itemId = req.params.itemId;
            const priceHistory = await prisma.itemPriceMaster.findMany({
                where: { itemId },
                orderBy: { createdAt: 'desc' }
            });
            res.status(200).json(priceHistory);
        } catch (err) {
            next(err);
        }
    }

    static async getAllItemPrices(req: any, res: Response, next: NextFunction) {
        try {
            const locationId = req.headers.location_id;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const items = await prisma.itemMaster.findMany({
                where: {
                    locationId,
                    isDisable: false
                },
                include: {
                    priceHistory: {
                        orderBy: { createdAt: 'asc' },
                        take: 1
                    },
                    supplier: true,
                    type: true
                },
                orderBy: { itemName: 'asc' }
            });

            const itemsWithPriceDetails = items.map(item => ({
                itemId: item.itemId,
                itemCode: item.itemCode,
                itemName: item.itemName,
                currentPrice: Number(item.purchasePrice),
                latestPriceUpdate: item.priceHistory[0]?.createdAt || item.createdAt,
                priceHistoryCount: item.priceHistory.length,
                category: item.type?.typeName,
                supplier: item.supplier?.supplierName,
                taxPercent: Number(item.taxPercent || 0)
            }));

            res.status(200).json(itemsWithPriceDetails);
        } catch (err) {
            next(err);
        }
    }

    static async getItemPriceStats(req: any, res: Response, next: NextFunction) {
        try {
            const itemId = req.params.itemId;
            
            const priceHistory = await prisma.itemPriceMaster.findMany({
                where: { itemId },
                orderBy: { createdAt: 'asc' }
            });

            if (priceHistory.length === 0) {
                res.status(404).json({ message: "No price history found" });
                return;
            }

            const prices = priceHistory.map(p => Number(p.price));
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            const currentPrice = prices[prices.length - 1];
            const firstPrice = prices[0];
            const priceChange = currentPrice - firstPrice;
            const priceChangePercent = firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(2) : '0.00';

            const item = await prisma.itemMaster.findUnique({
                where: { itemId },
                include: { supplier: true, type: true }
            });

            res.status(200).json({
                itemId,
                itemCode: item?.itemCode,
                itemName: item?.itemName,
                category: item?.type?.typeName,
                supplier: item?.supplier?.supplierName,
                currentPrice,
                firstPrice,
                minPrice,
                maxPrice,
                avgPrice: avgPrice.toFixed(2),
                priceChange: priceChange.toFixed(2),
                priceChangePercent,
                totalPriceUpdates: priceHistory.length,
                priceHistory: priceHistory.map(p => ({
                    id: p.id,
                    price: Number(p.price),
                    createdAt: p.createdAt
                }))
            });
        } catch (err) {
            next(err);
        }
    }

    static async bulkUpload(req: any, res: Response, next: NextFunction) {
        try {
            const locationId: string = req.headers.location_id as string;
            if (!locationId) {
                res.status(400).json({ message: "Location ID required" });
                return;
            }

            const items: BulkItemInput[] = req.body.items;
            if (!Array.isArray(items) || items.length === 0) {
                res.status(400).json({ message: "No items provided" });
                return;
            }
            if (items.length > 1000) {
                res.status(400).json({ message: "Maximum 1000 items per upload" });
                return;
            }

            // Fetch existing item codes for this location to detect duplicates
            const existingItems = await prisma.itemMaster.findMany({
                where: { locationId, isDisable: false },
                select: { itemCode: true }
            });
            const existingCodes = new Set(existingItems.map(i => i.itemCode.toLowerCase()));

            // Fetch tax percentages for all referenced tax IDs
            const taxIds = [...new Set(items.map(i => i.tax_id).filter(Boolean))] as string[];
            const taxes = taxIds.length > 0
                ? await prisma.taxMaster.findMany({ where: { taxId: { in: taxIds } } })
                : [];
            const taxMap = new Map(taxes.map(t => [t.taxId, Number(t.taxPercentage)]));

            const succeeded: string[] = [];
            const failed: { row: number; error: string }[] = [];

            const CHUNK = 100;
            for (let i = 0; i < items.length; i += CHUNK) {
                const chunk = items.slice(i, i + CHUNK);

                await Promise.all(chunk.map(async (item, idx) => {
                    const rowNum = i + idx + 2; // match Excel row numbering
                    const effectiveLocationId = item.location_id || locationId;

                    // Backend validation
                    if (!item.item_code?.trim()) {
                        failed.push({ row: rowNum, error: 'item_code is required' }); return;
                    }
                    if (!item.item_name?.trim()) {
                        failed.push({ row: rowNum, error: 'item_name is required' }); return;
                    }
                    if (!item.purchase_price || Number(item.purchase_price) <= 0) {
                        failed.push({ row: rowNum, error: 'purchase_price must be > 0' }); return;
                    }
                    if (existingCodes.has(item.item_code.toLowerCase())) {
                        failed.push({ row: rowNum, error: `item_code "${item.item_code}" already exists` }); return;
                    }

                    try {
                        // Auto-generate barcode
                        const barcodeValue = `INV${Date.now().toString().slice(-6)}${String(rowNum).padStart(3, '0')}`;
                        await QRCode.toDataURL(barcodeValue); // validate it generates fine

                        const taxPercent = item.tax_id ? (taxMap.get(item.tax_id) ?? 0) : (item.tax_percent ?? 0);
                        const purchasePrice = Number(item.purchase_price);
                        const totalAmount = purchasePrice + (purchasePrice * taxPercent) / 100;

                        const created = await prisma.itemMaster.create({
                            data: {
                                itemCode: item.item_code.trim(),
                                itemName: item.item_name.trim(),
                                locationId: effectiveLocationId,
                                currentQty: item.current_qty ?? 0,
                                barcode: barcodeValue,
                                supplierId: item.supplier_id || null,
                                typeId: item.type_id || null,
                                taxId: item.tax_id || null,
                                purchasePrice,
                                taxPercent,
                                totalAmount,
                                rol: item.rol ?? 0,
                                moq: item.moq ?? null,
                                eoq: item.eoq ?? null,
                                quantityType: item.quantityType ?? 'unit',
                                defaultIncrease: item.defaultIncrease ?? 1,
                                defaultDecrease: item.defaultDecrease ?? 1,
                                packQty: item.packQty ?? null,
                                groupName: item.groupName || null,
                            }
                        });

                        await prisma.itemPriceMaster.create({
                            data: { itemId: created.itemId, price: purchasePrice }
                        });

                        existingCodes.add(item.item_code.toLowerCase()); // prevent intra-batch duplicates
                        succeeded.push(created.itemId);
                    } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : 'Insert failed';
                        failed.push({ row: rowNum, error: msg });
                    }
                }));
            }

            res.status(200).json({
                successCount: succeeded.length,
                failed,
            });
        } catch (err) {
            next(err);
        }
    }

}
