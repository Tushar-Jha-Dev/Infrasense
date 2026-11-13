import express from "express";
import {
  listAssets,
  getAsset,
  getAssetHistory,
  createAsset,
  updateAsset,
  updateAssetStatus,
} from "../controllers/assetController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, listAssets);
router.get("/:id/history", protect, authorize("admin"), getAssetHistory);
router.get("/:id", protect, getAsset);
router.post("/", protect, authorize("admin"), createAsset);
router.put("/:id", protect, authorize("admin"), updateAsset);
router.patch("/:id/status", protect, authorize("admin"), updateAssetStatus);

export default router;
