import User from "../models/User.js";

let cachedPrimaryAdminId = null;

/**
 * Finds the primary admin user ID.
 * The primary admin is the admin user with the earliest createdAt (ties by _id).
 * Caches the ID in memory after the first successful lookup.
 * If the lookup fails or finds nothing, falls back to a fresh query and never caches null.
 * @returns {Promise<string|null>} The _id of the primary admin as a string, or null if no admin exists.
 */
export const getPrimaryAdminId = async () => {
  if (cachedPrimaryAdminId) {
    return cachedPrimaryAdminId;
  }

  const primaryAdmin = await User.findOne({ role: "admin" })
    .sort({ createdAt: 1, _id: 1 })
    .select("_id");

  if (primaryAdmin && primaryAdmin._id) {
    cachedPrimaryAdminId = primaryAdmin._id.toString();
    return cachedPrimaryAdminId;
  }

  return null;
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

/**
 * Resets the in-memory primary admin ID cache (useful for testing or seeding).
 */
export const clearPrimaryAdminCache = () => {
  cachedPrimaryAdminId = null;
};
