import express from "express";
import {
  listUsers,
  createUser,
  updateUser,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id", updateUser);

export default router;
