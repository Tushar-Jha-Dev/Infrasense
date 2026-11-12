import mongoose from "mongoose";
import User from "../models/User.js";

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

    res.json(users);
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
      userData.phone = phone.trim();
    }

    const user = await User.create(userData);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
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
      updates.phone = body.phone.trim();
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
      updates.isActive = body.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one valid field to update: name, phone, isActive",
      });
    }

    if (
      updates.isActive === false &&
      req.user?._id?.toString() === req.params.id
    ) {
      return res
        .status(400)
        .json({ message: "You cannot deactivate your own account" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("_id name email role phone isActive createdAt");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
