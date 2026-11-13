import express from "express";
import { rateLimit } from "express-rate-limit";
import {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Rate limiter for login: max 10 failed attempts per 15 min per IP.
// Successful logins do not count against the limit.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  statusCode: 429,
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for registration: max 20 requests per hour per IP.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  statusCode: 429,
  message: { message: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for password change: max 10 failed attempts per 15 min per IP.
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  statusCode: 429,
  message: { message: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", registerLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.patch("/password", passwordLimiter, protect, changePassword);

export default router;
