import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

export class categoriesController {
    static async createCategories(req: Request, res: Response, next: NextFunction) {
        try {
            const { typeName, description, type } = req.body
            const categories = await prisma.typeMaster.create({
                data: {
                    typeName: typeName,
                    description: description,
                    type,
                }
            })
            res.json(categories)
        } catch (error) {
            next(error)
        }
    }
    static async getAllCategories(req: Request, res: Response, next: NextFunction) {
        try {
            const categories = await prisma.typeMaster.findMany()
            res.json(categories)
        } catch (error) {
            next(error)
        }
    }
    static async getCategories(req: Request, res: Response, next: NextFunction){
        try {
            const type = req.query.type as 'item' | 'financial' | 'group'|'quantityType'|'paymentType'
            const categories = await prisma.typeMaster.findMany({
                where: {
                    type:type
                }})
            res.json(categories)
            }catch(err){
                next(err)
            }
    }
    static async getCategoriesById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.categoriesId
            const categories = await prisma.typeMaster.findUnique({
                where: {
                    typeId: id
                }
            });
            res.json(categories);
        } catch (error) {
            next(error)
        }
    }
    static async updateCategories(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.categoriesId
            const { typeName, description } = req.body
            const categories = await prisma.typeMaster.update({
                where: {
                    typeId: id
                },
                data: {
                    typeName: typeName,
                    description: description
                }
            })
            res.json(categories)
        } catch (error) {
            next(error)
        }
    }
    static async deleteCategories(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.categoriesId
            const categories = await prisma.typeMaster.delete({
                where: {
                    typeId: id
                }
            })
            res.json(categories)
        } catch (error) {
            next(error)
        }
    }
}