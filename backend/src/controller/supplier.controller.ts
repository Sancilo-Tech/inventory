import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

export class SupplierController {
    static async createSupplier(req: Request, res: Response, next: NextFunction) {
        try {
            const { supplierName, address, email, phone, contactPerson, vatId, taxId, ibanNumber, secondaryEmail, SecondaryPhone } = req.body
            const supplier = await prisma.supplierMaster.create({
                data: {
                    supplierName,
                    address,
                    contactPerson,
                    phone,
                    email,
                    vatId,
                    taxId,
                    ibanNumber,
                    secondaryEmail,
                    SecondaryPhone
                }
            })
            res.json(supplier)
        } catch (error) {
            next(error)
        }
    }
    static async getAllSuppliers(req: Request, res: Response, next: NextFunction) {
        try {
            const suppliers = await prisma.supplierMaster.findMany()
            res.json(suppliers)
        } catch (error) {
            next(error)
        }
    }
    static async getSupplierById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.supplierId
            const supplier = await prisma.supplierMaster.findUnique({
                where: {
                    supplierId: id
                }
            })
            res.json(supplier)
        } catch (error) {
            next(error)
        }
    }
    static async updateSupplier(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.supplierId
            const { supplierName, address, email, phone, contactPerson, vatId, taxId, ibanNumber, secondaryEmail, SecondaryPhone } = req.body
            const supplier = await prisma.supplierMaster.update({
                where: {
                    supplierId: id
                },
                data: {
                    supplierName,
                    address,
                    contactPerson,
                    phone,
                    email,
                    vatId,
                    taxId,
                    ibanNumber,
                    secondaryEmail,
                    SecondaryPhone
                }
            });
            res.json(supplier);
        } catch (error) {
            next(error)
        }
    }
    static async deleteSupplier(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.supplierId
            const supplier = await prisma.supplierMaster.delete({
                where: {
                    supplierId: id
                }
            })
            res.json(supplier)
        } catch (error) {
            next(error)
        }
    }

    static async bulkUpload(req: Request, res: Response, next: NextFunction) {
        try {
            const rows: any[] = req.body.suppliers;
            if (!Array.isArray(rows) || rows.length === 0) {
                res.status(400).json({ message: 'No data provided' });
                return;
            }
            const successList: any[] = [];
            const failed: { row: number; error: string }[] = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    const supplier = await prisma.supplierMaster.create({
                        data: {
                            supplierName: row.supplierName,
                            contactPerson: row.contactPerson || undefined,
                            phone: row.phone || undefined,
                            SecondaryPhone: row.SecondaryPhone || undefined,
                            email: row.email || undefined,
                            secondaryEmail: row.secondaryEmail || undefined,
                            address: row.address || undefined,
                            vatId: row.vatId || undefined,
                            taxId: row.taxId || undefined,
                            ibanNumber: row.ibanNumber || undefined,
                        }
                    });
                    successList.push(supplier);
                } catch (err: any) {
                    failed.push({ row: i + 2, error: err?.message || 'Unknown error' });
                }
            }
            res.json({ successCount: successList.length, failed });
        } catch (error) {
            next(error);
        }
    }
}