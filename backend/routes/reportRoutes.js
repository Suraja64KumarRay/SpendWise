import { Router } from "express";
import { monthlyReport, yearlyReport, customReport, exportCsv } from "../controllers/reportController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/monthly", monthlyReport);
router.get("/yearly", yearlyReport);
router.get("/custom", customReport);
router.get("/export", exportCsv);

export default router;
