import express from "express";
import {
  createComplaint,
  getMyComplaints,
  getComplaint,
  listComplaints,
  reviewComplaint,
  assignComplaint,
  closeComplaint,
} from "../controllers/complaintController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, authorize("admin"), listComplaints);
router.post("/", protect, authorize("user"), createComplaint);
router.get("/mine", protect, authorize("user"), getMyComplaints);
router.get("/:id", protect, getComplaint);
router.patch("/:id/review", protect, authorize("admin"), reviewComplaint);
router.patch("/:id/assign", protect, authorize("admin"), assignComplaint);
router.patch("/:id/close", protect, authorize("admin"), closeComplaint);

export default router;
