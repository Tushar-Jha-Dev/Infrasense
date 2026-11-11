import express from "express";
import {
  createComplaint,
  getMyComplaints,
  getComplaint,
} from "../controllers/complaintController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, authorize("user"), createComplaint);
router.get("/mine", protect, authorize("user"), getMyComplaints);
router.get("/:id", protect, getComplaint);

export default router;
