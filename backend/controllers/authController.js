import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { getPrimaryAdminId } from "../utils/primaryAdmin.js";

const AVATAR_REGEX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // role is NOT taken from the request, so it defaults to "user"
    // mustChangePassword defaults to false
    const user = await User.create({ name, email, password, phone });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // password is hidden by default, so we ask for it explicitly here
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password +avatar");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    const primaryId = await getPrimaryAdminId();

    res.json({
      token: generateToken(user),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        createdAt: user.createdAt,
        avatar: user.avatar || "",
        mustChangePassword: Boolean(user.mustChangePassword),
        isPrimaryAdmin: user.role === "admin" && primaryId === user._id.toString(),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+avatar");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const primaryId = await getPrimaryAdminId();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      createdAt: user.createdAt,
      avatar: user.avatar || "",
      mustChangePassword: Boolean(user.mustChangePassword),
      isPrimaryAdmin: user.role === "admin" && primaryId === user._id.toString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateMe = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ message: "Request body must be a JSON object" });
    }

    const updates = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      updates.name = body.name.trim();
    }

    if (body.phone !== undefined) {
      if (typeof body.phone !== "string") {
        return res.status(400).json({ message: "Phone must be a string" });
      }
      const trimmedPhone = body.phone.trim();
      if (trimmedPhone.length > 30) {
        return res.status(400).json({ message: "Phone number cannot exceed 30 characters" });
      }
      updates.phone = trimmedPhone;
    }

    if (body.avatar !== undefined) {
      if (typeof body.avatar !== "string") {
        return res.status(400).json({ message: "Avatar must be a string" });
      }
      const trimmedAvatar = body.avatar.trim();
      if (trimmedAvatar === "") {
        updates.avatar = "";
      } else {
        if (trimmedAvatar.length > 70000) {
          return res.status(400).json({ message: "Avatar image is too large" });
        }
        if (!AVATAR_REGEX.test(trimmedAvatar)) {
          return res.status(400).json({
            message: "Avatar must be a valid JPEG, PNG, or WebP base64 data URL",
          });
        }
        updates.avatar = trimmedAvatar;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one valid field to update: name, phone, avatar",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("+avatar");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const primaryId = await getPrimaryAdminId();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone || "",
      createdAt: updatedUser.createdAt,
      avatar: updatedUser.avatar || "",
      mustChangePassword: Boolean(updatedUser.mustChangePassword),
      isPrimaryAdmin:
        updatedUser.role === "admin" && primaryId === updatedUser._id.toString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ message: "Request body must be a JSON object" });
    }

    const { currentPassword, newPassword } = body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    const isSamePassword = await user.matchPassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.status(200).json({ message: "Password changed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
