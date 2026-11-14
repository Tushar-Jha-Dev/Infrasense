import express from "express";
import {
  getAnalyticsSummary,
  getCostDetails,
  exportCostsCsv,
} from "../controllers/analyticsController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/summary", protect, authorize("admin"), getAnalyticsSummary);
router.get("/costs", protect, authorize("admin"), getCostDetails);
router.get("/costs/export", protect, authorize("admin"), exportCostsCsv);

export default router;
