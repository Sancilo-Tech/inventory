import { Router } from "express";
import asyncHandler from 'express-async-handler';
import authMiddleware from "../middleware/auth.middleware";
import { SupplierController } from "../controller/supplier.controller";

const route=Router();


route.use(authMiddleware);

route.post("/create",asyncHandler(SupplierController.createSupplier));
route.get("/all", asyncHandler(SupplierController.getAllSuppliers));
route.get("/:supplierId", asyncHandler(SupplierController.getSupplierById));
route.put("/update/:supplierId", asyncHandler(SupplierController.updateSupplier));
route.delete("/delete/:supplierId", asyncHandler(SupplierController.deleteSupplier));
route.post("/bulk-upload", asyncHandler(SupplierController.bulkUpload));
export default route;