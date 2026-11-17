import express from "express";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listPasswordResets,
  resetUserPassword,
  dismissPasswordReset,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, authorize("admin"));

// Password reset routes (must precede /:id)
router.get("/password-resets", listPasswordResets);
router.patch("/password-resets/:requestId/dismiss", dismissPasswordReset);

router.get("/", listUsers);
router.post("/", createUser);
router.post("/:id/reset-password", resetUserPassword);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
