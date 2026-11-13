import mongoose from "mongoose";
import Asset, { ASSET_CONDITIONS, ASSET_STATUSES } from "../models/Asset.js";
import MaintenanceRecord from "../models/MaintenanceRecord.js";
import Complaint from "../models/Complaint.js";
import User from "../models/User.js";
import { CATEGORIES } from "../constants/categories.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const STRING_FIELDS = [
  "assetId",
  "name",
  "category",
  "description",
  "building",
  "location",
  "condition",
  "status",
];

// Validates and extracts only whitelisted Asset fields from req.body
function extractAssetPayload(body, { isUpdate = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  for (const field of STRING_FIELDS) {
    if (body[field] !== undefined && typeof body[field] !== "string") {
      return { error: `${field} must be a string` };
    }
  }

  if (!isUpdate) {
    if (
      !body.assetId?.trim() ||
      !body.name?.trim() ||
      !body.category?.trim()
    ) {
      return { error: "assetId, name and category are required" };
    }
  }

  const payload = {};

  if (body.assetId !== undefined) {
    const assetId = body.assetId.trim().toUpperCase();
    if (!assetId) {
      return { error: "assetId cannot be empty" };
    }
    payload.assetId = assetId;
  }

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return { error: "name cannot be empty" };
    }
    payload.name = name;
  }

  if (body.category !== undefined) {
    const category = body.category.trim();
    if (!CATEGORIES.includes(category)) {
      return { error: `Invalid category. Allowed: ${CATEGORIES.join(", ")}` };
    }
    payload.category = category;
  }

  if (body.description !== undefined) {
    payload.description = body.description.trim();
  }

  if (body.building !== undefined) {
    payload.building = body.building.trim();
  }

  if (body.location !== undefined) {
    payload.location = body.location.trim();
  }

  if (body.condition !== undefined) {
    const condition = body.condition.trim();
    if (!ASSET_CONDITIONS.includes(condition)) {
      return {
        error: `Invalid condition. Allowed: ${ASSET_CONDITIONS.join(", ")}`,
      };
    }
    payload.condition = condition;
  }

  if (body.status !== undefined) {
    const status = body.status.trim();
    if (!ASSET_STATUSES.includes(status)) {
      return { error: `Invalid status. Allowed: ${ASSET_STATUSES.join(", ")}` };
    }
    payload.status = status;
  }

  if (body.installationDate !== undefined) {
    if (body.installationDate === null || body.installationDate === "") {
      if (isUpdate) {
        payload.installationDate = null;
      }
    } else if (typeof body.installationDate !== "string") {
      return { error: "installationDate must be a valid date string" };
    } else {
      const parsedDate = new Date(body.installationDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return { error: "installationDate must be a valid date" };
      }
      payload.installationDate = parsedDate;
    }
  }

  return { payload };
}

export const listAssets = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const filter = {};

    if (typeof category === "string" && category.trim()) {
      filter.category = category.trim();
    }

    if (typeof status === "string" && status.trim()) {
      filter.status = status.trim();
    }

    if (typeof search === "string" && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ name: regex }, { assetId: regex }, { building: regex }];
    }

    const assets = await Asset.find(filter).sort({ createdAt: -1 });
    res.json(assets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAsset = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid asset ID" });
    }

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json(asset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createAsset = async (req, res) => {
  try {
    const { payload, error } = extractAssetPayload(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const existing = await Asset.findOne({ assetId: payload.assetId });
    if (existing) {
      return res.status(409).json({ message: "Asset ID already exists" });
    }

    const asset = await Asset.create(payload);
    res.status(201).json(asset);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Asset ID already exists" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid asset ID" });
    }

    const { payload, error } = extractAssetPayload(req.body, { isUpdate: true });
    if (error) {
      return res.status(400).json({ message: error });
    }

    if (Object.keys(payload).length === 0) {
      return res
        .status(400)
        .json({ message: "Provide at least one field to update" });
    }

    const asset = await Asset.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json(asset);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Asset ID already exists" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateAssetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid asset ID" });
    }

    const { status, condition } = req.body || {};
    if (status === undefined && condition === undefined) {
      return res
        .status(400)
        .json({ message: "Provide status or condition to update" });
    }

    const updates = {};

    if (status !== undefined) {
      if (typeof status !== "string" || !ASSET_STATUSES.includes(status.trim())) {
        return res.status(400).json({
          message: `Invalid status. Allowed: ${ASSET_STATUSES.join(", ")}`,
        });
      }
      updates.status = status.trim();
    }

    if (condition !== undefined) {
      if (
        typeof condition !== "string" ||
        !ASSET_CONDITIONS.includes(condition.trim())
      ) {
        return res.status(400).json({
          message: `Invalid condition. Allowed: ${ASSET_CONDITIONS.join(", ")}`,
        });
      }
      updates.condition = condition.trim();
    }

    const asset = await Asset.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json(asset);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAssetHistory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid asset ID" });
    }

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const records = await MaintenanceRecord.find({ asset: asset._id })
      .sort({ completedAt: -1 })
      .populate("technician", "name")
      .populate("complaint", "complaintId title");

    const rawCost = records.reduce(
      (sum, record) => sum + (Number(record.cost) || 0),
      0
    );
    const totalCost = Math.round((rawCost + Number.EPSILON) * 100) / 100;

    res.json({
      asset: {
        _id: asset._id,
        assetId: asset.assetId,
        name: asset.name,
        category: asset.category,
        building: asset.building,
        location: asset.location,
        condition: asset.condition,
        status: asset.status,
      },
      summary: {
        recordCount: records.length,
        totalCost,
      },
      records,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

