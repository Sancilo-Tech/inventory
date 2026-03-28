import { Router } from "express";
import asyncHandler from 'express-async-handler';
import authMiddleware from "../middleware/auth.middleware";
import { ReportController } from "../controller/report.controller";

const route = Router();

route.use(authMiddleware);

route.get("/summary", asyncHandler(ReportController.getSummary));
route.get("/list", asyncHandler(ReportController.getList));
route.get("/charts", asyncHandler(ReportController.getCharts));
route.get("/item-analysis", asyncHandler(ReportController.getItemAnalysis));
route.get("/rol-recommendations", asyncHandler(ReportController.getROLRecommendations));
route.get("/supplier-price-analysis", asyncHandler(ReportController.getSupplierPriceAnalysis));
route.get("/daily-log", asyncHandler(ReportController.getDailyLog));
route.get("/monthly-log", asyncHandler(ReportController.getMonthlyLog));
route.get("/stock-report", asyncHandler(ReportController.getStockReport));
route.get("/high-consumption", asyncHandler(ReportController.getHighConsumption));
route.get("/low-consumption", asyncHandler(ReportController.getLowConsumption));
route.get("/predictive-analytics", asyncHandler(ReportController.getPredictiveAnalytics));
route.get("/abc-analysis", asyncHandler(ReportController.getABCAnalysis));
route.get("/seasonal-trends", asyncHandler(ReportController.getSeasonalTrends));
route.get("/smart-insights", asyncHandler(ReportController.getSmartInsights));
route.get("/transaction-analysis", asyncHandler(ReportController.getTransactionAnalysis));
route.get("/grouped-products", asyncHandler(ReportController.getGroupedProducts));
route.get("/price-change-report", asyncHandler(ReportController.getPriceChangeReport));

export default route;
