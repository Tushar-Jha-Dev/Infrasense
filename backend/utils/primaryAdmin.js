import User from "../models/User.js";

/**
 * Finds the primary admin user ID.
 * The primary admin is the admin user with the earliest createdAt (ties by _id).
 * @returns {Promise<string|null>} The _id of the primary admin as a string, or null if no admin exists.
 */
export const getPrimaryAdminId = async () => {
  const primaryAdmin = await User.findOne({ role: "admin" })
    .sort({ createdAt: 1, _id: 1 })
    .select("_id");
  return primaryAdmin ? primaryAdmin._id.toString() : null;
};

/**
 * Checks if a given user ID corresponds to the primary admin.
 * @param {string|import("mongoose").Types.ObjectId} userId
 * @returns {Promise<boolean>}
 */
export const isUserPrimaryAdmin = async (userId) => {
  if (!userId) return false;
  const primaryId = await getPrimaryAdminId();
  return primaryId === userId.toString();
};
