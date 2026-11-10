import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verifies the Bearer JWT, loads the active user, and attaches them to req.user
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (typeof authHeader !== "string") {
      return res.status(401).json({ message: "Not authorized, missing token" });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
      return res.status(401).json({ message: "Not authorized, invalid token format" });
    }

    const token = parts[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Not authorized, invalid or expired token" });
    }

    if (!decoded?.id) {
      return res.status(401).json({ message: "Not authorized, invalid token payload" });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user no longer exists" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Restricts route access to users whose role is in the allowed list
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to perform this action" });
    }
    next();
  };
};
