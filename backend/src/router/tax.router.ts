import { Router } from "express";
import { TaxController } from "../controller/tax.controller";
import asyncHandler from 'express-async-handler';
const route=Router();

route.post("/create",asyncHandler(TaxController.createTax));
route.get("/all", asyncHandler(TaxController.getAllTax));
route.get("/get-by-id/:taxId", asyncHandler(TaxController.getTaxById));
route.put("/update/:taxId", asyncHandler(TaxController.updateTax));
route.delete("/delete/:taxId", asyncHandler(TaxController.deleteTax));
route.post("/bulk-upload", asyncHandler(TaxController.bulkUpload));

export default route;