import express from "express";
import {
  createComplaint,
  getMyComplaints,
  getComplaint,
  listComplaints,
  reviewComplaint,
  assignComplaint,
  closeComplaint,
  getComplaintMaintenance,
} from "../controllers/complaintController.js";
import {
  getAssignedComplaints,
  startComplaint,
  resolveComplaint,
} from "../controllers/technicianController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, authorize("admin"), listComplaints);
router.post("/", protect, authorize("user"), createComplaint);
router.get("/mine", protect, authorize("user"), getMyComplaints);
router.get("/assigned", protect, authorize("technician"), getAssignedComplaints);
router.get("/:id", protect, getComplaint);
router.get("/:id/maintenance", protect, getComplaintMaintenance);
router.patch("/:id/review", protect, authorize("admin"), reviewComplaint);
router.patch("/:id/assign", protect, authorize("admin"), assignComplaint);
router.patch("/:id/start", protect, authorize("technician"), startComplaint);
router.post("/:id/resolve", protect, authorize("technician"), resolveComplaint);
router.patch("/:id/close", protect, authorize("admin"), closeComplaint);

export default router;
