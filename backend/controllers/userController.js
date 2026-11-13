import mongoose from "mongoose";
import User from "../models/User.js";
import Complaint from "../models/Complaint.js";
import MaintenanceRecord from "../models/MaintenanceRecord.js";
import { getPrimaryAdminId } from "../utils/primaryAdmin.js";

const ALLOWED_ROLES = ["user", "admin", "technician"];
const CREATABLE_ROLES = ["technician", "admin"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listUsers = async (req, res) => {
  try {
    const { role, isActive, search } = req.query;
    const filter = {};

    if (role !== undefined && role !== "") {
      if (typeof role !== "string" || !ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Allowed: ${ALLOWED_ROLES.join(", ")}`,
        });
      }
      filter.role = role;
    }

    if (isActive !== undefined && isActive !== "") {
      if (isActive === "true") {
        filter.isActive = true;
      } else if (isActive === "false") {
        filter.isActive = false;
      } else {
        return res
          .status(400)
          .json({ message: 'isActive must be "true" or "false"' });
      }
    }

    if (typeof search === "string" && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const users = await User.find(filter)
      .select("_id name email role phone isActive createdAt")
      .sort({ createdAt: -1 });

    const primaryId = await getPrimaryAdminId();

    const result = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      isActive: u.isActive,
      createdAt: u.createdAt,
      isPrimaryAdmin: u.role === "admin" && primaryId === u._id.toString(),
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createUser = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ message: "Request body must be a JSON object" });
    }

    const { name, email, password, phone, role } = body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (typeof password !== "string" || !password.trim() || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    if (phone !== undefined && typeof phone !== "string") {
      return res.status(400).json({ message: "Phone must be a string" });
    }

    if (typeof role !== "string" || !CREATABLE_ROLES.includes(role)) {
      return res.status(400).json({
        message: 'Role must be "technician" or "admin"',
      });
    }

    const primaryId = await getPrimaryAdminId();
    const callerIsPrimary =
      req.user?.role === "admin" && primaryId === req.user._id.toString();

    // Rule: only the primary admin may create admins
    if (role === "admin" && !callerIsPrimary) {
      return res.status(403).json({
        message: "Only the primary admin can create admins",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
    };

    if (phone !== undefined) {
      const trimmedPhone = phone.trim();
      if (trimmedPhone.length > 30) {
        return res
          .status(400)
          .json({ message: "Phone number cannot exceed 30 characters" });
      }
      userData.phone = trimmedPhone;
    }

    const user = await User.create(userData);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
      isPrimaryAdmin: user.role === "admin" && primaryId === user._id.toString(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ message: "Request body must be a JSON object" });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const primaryId = await getPrimaryAdminId();
    const isTargetPrimary =
      targetUser.role === "admin" && primaryId === targetUser._id.toString();
    const callerIsPrimary =
      req.user?.role === "admin" && primaryId === req.user._id.toString();

    // If target is an admin
    if (targetUser.role === "admin") {
      // Only the primary admin may act on admins, and only on other admins
      if (!callerIsPrimary) {
        return res.status(403).json({
          message: "Only the primary admin can manage other admins",
        });
      }
    }

    const updates = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return res
          .status(400)
          .json({ message: "Name must be a non-empty string" });
      }
      updates.name = body.name.trim();
    }

    if (body.phone !== undefined) {
      if (typeof body.phone !== "string") {
        return res.status(400).json({ message: "Phone must be a string" });
      }
      const trimmedPhone = body.phone.trim();
      if (trimmedPhone.length > 30) {
        return res
          .status(400)
          .json({ message: "Phone number cannot exceed 30 characters" });
      }
      updates.phone = trimmedPhone;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
      updates.isActive = body.isActive;
    }

    if (body.role !== undefined) {
      if (typeof body.role !== "string" || !ALLOWED_ROLES.includes(body.role)) {
        return res.status(400).json({
          message: `Invalid role. Allowed: ${ALLOWED_ROLES.join(", ")}`,
        });
      }
      if (body.role !== targetUser.role) {
        // Changing to or from "admin" requires primary admin
        if (targetUser.role === "admin" || body.role === "admin") {
          if (!callerIsPrimary) {
            return res.status(403).json({
              message: "Only the primary admin can manage other admins",
            });
          }
        }
        updates.role = body.role;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one valid field to update: name, phone, isActive, role",
      });
    }

    // Protection rule for primary admin:
    // Nobody (including primary admin) may deactivate, demote or delete the primary admin
    if (isTargetPrimary) {
      if (updates.isActive === false || (updates.role && updates.role !== "admin")) {
        return res.status(403).json({
          message: "The primary admin cannot be removed",
        });
      }
    }

    // A user cannot deactivate their own account
    if (
      updates.isActive === false &&
      req.user?._id?.toString() === req.params.id
    ) {
      return res
        .status(400)
        .json({ message: "You cannot deactivate your own account" });
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("_id name email role phone isActive createdAt");

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      isPrimaryAdmin:
        updatedUser.role === "admin" && primaryId === updatedUser._id.toString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // Cannot delete yourself
    if (req.user?._id?.toString() === req.params.id) {
      return res
        .status(403)
        .json({ message: "You cannot delete your own account" });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const primaryId = await getPrimaryAdminId();
    const isTargetPrimary =
      targetUser.role === "admin" && primaryId === targetUser._id.toString();
    const callerIsPrimary =
      req.user?.role === "admin" && primaryId === req.user._id.toString();

    // The primary admin cannot be deleted
    if (isTargetPrimary) {
      return res.status(403).json({
        message: "The primary admin cannot be removed",
      });
    }

    // If target is an admin, only primary admin can delete them
    if (targetUser.role === "admin" && !callerIsPrimary) {
      return res.status(403).json({
        message: "Only the primary admin can manage other admins",
      });
    }

    // Check linked complaints or maintenance records
    const hasComplaint = await Complaint.exists({
      $or: [
        { submittedBy: req.params.id },
        { assignedTo: req.params.id },
        { assignedBy: req.params.id },
        { reviewedBy: req.params.id },
        { "statusHistory.changedBy": req.params.id },
      ],
    });

    const hasRecord = await MaintenanceRecord.exists({
      technician: req.params.id,
    });

    if (hasComplaint || hasRecord) {
      return res.status(409).json({
        message:
          "This account has linked complaints or records and cannot be deleted. Deactivate it instead.",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
