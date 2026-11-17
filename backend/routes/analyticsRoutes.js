import { Router } from "express";
import { getSummary, getMonthly, getCategoryBreakdown, getTrends } from "../controllers/analyticsController.js";
import { getInsights } from "../controllers/insightsController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/summary", getSummary);
router.get("/monthly", getMonthly);
router.get("/categories", getCategoryBreakdown);
router.get("/trends", getTrends);
router.get("/insights", getInsights);

export default router;
