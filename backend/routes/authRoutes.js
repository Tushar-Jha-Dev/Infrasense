import express from "express";
import {
  registerUser,
  loginUser,
  getMe,
} from "../controllers/authController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);

// TEMPORARY route for testing protect + authorize("admin") — remove when real admin routes exist
router.get("/admin-check", protect, authorize("admin"), (req, res) => {
  res.json({ message: "admin ok" });
});

export default router;
