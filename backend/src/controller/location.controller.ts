
import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

export class LocationController {
    // Create User Location
    static async createLocation(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                locationCode,
                locationName,
                address,
                city,
                state,
                country,
            } = req.body;

            const location = await prisma.location.create({
                data: {
                    locationCode: locationCode,
                    locationName: locationName,
                    address: address,
                    city: city,
                    state: state,
                    country: country,
                }

            })
            res.status(200).json(location)
        } catch (err) {
            next(err)
        }
    }
    // Get All Location
    static async getAllLocation(req: Request, res: Response, next: NextFunction) {
        try {
            const locations = await prisma.location.findMany();
            res.status(200).json(locations)
        } catch (err) {
            next(err)
        }
    }
    // Get Particular Location
    static async getLocationById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.locationId
            const location = await prisma.location.findUnique({
                where: {
                    locationId: id
                }
            })
            res.status(200).json(location)
        } catch (err) {
            next(err)
        }
    }
    // Update Location
    static async updateLocation(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.locationId
            const {
                locationCode,
                locationName,
                address,
                city,
                state,
                country,
            } = req.body;
            const location = await prisma.location.update({
                where: {
                    locationId: id
                },
                data: {
                    locationCode: locationCode,
                    locationName: locationName,
                    address: address,
                    city: city,
                    state: state,
                    country: country,
                }
            })
            res.status(200).json(location)
        } catch (err) {
            next(err)
        }
    }
    // Delete a location
    static async deleteLocation(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.locationId
            const location = await prisma.location.delete({
                where: {
                    locationId: id
                }
            })
            res.status(200).json(location)
        } catch (err) {
            next(err)
        }
    }
    // Assign a location to user (no-op for selection — location is tracked client-side)
    static async assignLocation(req: any, res: Response, next: NextFunction) {
        res.status(200).json({ message: 'ok' });
    }
    static async getUserLocation(req: any, res: Response, next: NextFunction) {
        try {
            const userId = req.user.id;
            const user = await prisma.user.findUnique({
                where: { userId },
                select: { locationIds: true, role: true },
            });

            // Admin/manager with no locationIds restriction → return all active locations
            if (!user || user.locationIds.length === 0) {
                const allLocations = await prisma.location.findMany({ where: { isActive: true } });
                res.status(200).json(allLocations);
                return;
            }

            const locations = await prisma.location.findMany({
                where: { locationId: { in: user.locationIds }, isActive: true },
            });
            res.status(200).json(locations);
        } catch (err) {
            next(err);
        }
    }
    static async getUserLocationById(req: any, res: Response, next: NextFunction) {
        try {
            const userId = req.user.id
            // console.log("Hello")
            const userLocation = await prisma.userLocation.findFirst({
                where: {
                    userId: userId,
                },
                include: {
                    location: true,
                },
            });
            res.status(200).json(userLocation)
        } catch (err) {
            next(err)
        }
    }

}