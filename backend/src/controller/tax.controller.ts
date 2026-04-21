import { NextFunction,Request,Response } from "express"
import { prisma } from "../lib/prisma"

export class TaxController{
    static async createTax(req:Request, res:Response, next:NextFunction){
        try{
            const {tax_name, taxPercentage,description} = req.body
            const tax = await prisma.taxMaster.create({
                data:{
                    tax_name: tax_name,
                    taxPercentage:taxPercentage,
                    description:description
                }
            })
            res.json(tax)
        }catch(error){
            next(error)
        }
    }
    static async getAllTax(req:Request, res:Response, next:NextFunction){
        try{
            const tax = await prisma.taxMaster.findMany()
            res.json(tax)
               
        }catch(error){
            next(error)
        }
    }
    static async getTaxById(req:Request, res:Response, next:NextFunction){
        try{
            const id = req.params.taxId
            const tax = await prisma.taxMaster.findUnique({
                where:{
                    taxId:id
                }
            })
            res.json(tax)
        }catch(error){
            next(error)
        }
    }
    static async updateTax(req:Request, res:Response, next:NextFunction){
        try{
            const id = req.params.taxId
            const {tax_name, taxPercentage,description} = req.body
            const tax = await prisma.taxMaster.update({
                where:{
                    taxId:id
                },
                data:{
                    tax_name: tax_name,
                    taxPercentage:taxPercentage,
                    description:description
                }
            })
            res.json(tax)
        }catch(error){
            next(error)
        }
    }
    static async deleteTax(req:Request, res:Response, next:NextFunction){
        try{
            const id = req.params.taxId
            const tax = await prisma.taxMaster.delete({
                where:{
                    taxId:id
                }
            })
            res.json(tax)
        }catch(error){
            next(error)
        }
    }

    static async bulkUpload(req:Request, res:Response, next:NextFunction){
        try{
            const rows: any[] = req.body.taxes;
            if (!Array.isArray(rows) || rows.length === 0) {
                res.status(400).json({ message: 'No data provided' });
                return;
            }
            const successList: any[] = [];
            const failed: { row: number; error: string }[] = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    const tax = await prisma.taxMaster.create({
                        data: {
                            tax_name: row.tax_name,
                            taxPercentage: row.taxPercentage,
                            description: row.description || undefined,
                        }
                    });
                    successList.push(tax);
                } catch (err: any) {
                    failed.push({ row: i + 2, error: err?.message || 'Unknown error' });
                }
            }
            res.json({ successCount: successList.length, failed });
        }catch(error){
            next(error)
        }
    }
}