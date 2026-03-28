
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
    // Assign a location to user
    static async assignLocation(req: any, res: Response, next: NextFunction) {
        try {
            const { locationId } = req.body;
            const userId = req.user.id;

            // Empty locationId means clear — delete all user location rows
            if (!locationId) {
                await prisma.userLocation.deleteMany({ where: { userId } });
                res.status(200).json({ message: 'Location cleared' });
                return;
            }

            const userLocation = await prisma.userLocation.upsert({
                where: { userId_locationId: { userId, locationId } },
                update: {},
                create: { userId, locationId },
            });
            res.status(200).json(userLocation);
        } catch (err) {
            next(err)
        }
    }
    static async getUserLocation(req: any, res: Response, next: NextFunction) {
        try {
            const userId = req.user.id;

            // Primary: check UserLocation join table (set via assignLocation)
            const userLocationRows = await prisma.userLocation.findMany({
                where: { userId },
                include: { location: true },
            });

            if (userLocationRows.length > 0) {
                res.status(200).json(userLocationRows.map(r => r.location));
                return;
            }

            // Fallback: check locationIds array on User record
            const user = await prisma.user.findUnique({
                where: { userId },
                select: { locationIds: true },
            });

            if (!user || user.locationIds.length === 0) {
                // Last resort: return all locations so user is never stuck
                const allLocations = await prisma.location.findMany({
                    where: { isActive: true },
                });
                res.status(200).json(allLocations);
                return;
            }

            const locations = await prisma.location.findMany({
                where: { locationId: { in: user.locationIds } },
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