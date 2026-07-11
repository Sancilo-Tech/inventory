import { Router } from "express";
import asyncHandler from 'express-async-handler';
import authMiddleware from "../middleware/auth.middleware";
import { ItemController } from "../controller/item.controller";

const route = Router();

route.use(authMiddleware);

route.post("/create", asyncHandler(ItemController.addItem));
route.get("/all", asyncHandler(ItemController.getAllItem));
route.get("/paginated", asyncHandler(ItemController.getPaginatedItems));
route.get("/get-by-id/:itemId", asyncHandler(ItemController.getItemById));
route.get("/barcode/:barcode", asyncHandler(ItemController.getItemByBarcode));
route.get("/code/:itemCode", asyncHandler(ItemController.getItemByCode));
route.put("/update/:itemId", asyncHandler(ItemController.updateItem));
route.delete("/delete/:itemId", asyncHandler(ItemController.deleteItem));
route.get("/price-history/:itemId", asyncHandler(ItemController.getItemPriceHistory));
route.get("/all-prices", asyncHandler(ItemController.getAllItemPrices));
route.get("/price-stats/:itemId", asyncHandler(ItemController.getItemPriceStats));
route.post("/bulk-upload", asyncHandler(ItemController.bulkUpload));

// product config
route.get("/config/:itemId", asyncHandler(ItemController.getItemById));
export default route;