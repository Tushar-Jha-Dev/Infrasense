import mongoose from "mongoose";
import Asset from "../models/Asset.js";
import Complaint from "../models/Complaint.js";
import { COMPLAINT_STATUSES } from "../constants/complaints.js";
import { getNextSequence } from "../utils/sequence.js";

export const createComplaint = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res
        .status(400)
        .json({ message: "Request body must be a JSON object" });
    }

    const { title, description, asset, location } = body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length > 120) {
      return res
        .status(400)
        .json({ message: "Title must be 120 characters or fewer" });
    }

    if (typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ message: "Description is required" });
    }
    const cleanDescription = description.trim();
    if (cleanDescription.length > 2000) {
      return res
        .status(400)
        .json({ message: "Description must be 2000 characters or fewer" });
    }

    let cleanLocation = "";
    if (location !== undefined && location !== null) {
      if (typeof location !== "string") {
        return res.status(400).json({ message: "Location must be a string" });
      }
      cleanLocation = location.trim();
    }

    let cleanAssetId = null;
    if (asset !== undefined && asset !== null && asset !== "") {
      if (
        typeof asset !== "string" ||
        !mongoose.Types.ObjectId.isValid(asset)
      ) {
        return res.status(400).json({ message: "Invalid asset ID" });
      }

      const existingAsset = await Asset.findById(asset);
      if (!existingAsset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      cleanAssetId = existingAsset._id;
    }

    if (!cleanAssetId && !cleanLocation) {
      return res.status(400).json({
        message: "Please provide an asset or a location",
      });
    }

    const seq = await getNextSequence("complaint");
    const complaintId = `CMP-${String(seq).padStart(4, "0")}`;

    const complaintData = {
      complaintId,
      title: cleanTitle,
      description: cleanDescription,
      location: cleanLocation,
      submittedBy: req.user._id,
      status: "Submitted",
      statusHistory: [
        {
          status: "Submitted",
          changedBy: req.user._id,
          note: "Complaint submitted",
        },
      ],
    };

    if (cleanAssetId) {
      complaintData.asset = cleanAssetId;
    }

    const complaint = await Complaint.create(complaintData);
    await complaint.populate("asset", "assetId name");

    res.status(201).json(complaint);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyComplaints = async (req, res) => {
  try {
    const filter = { submittedBy: req.user._id };
    const { status } = req.query;

    if (status !== undefined && status !== "") {
      if (
        typeof status !== "string" ||
        !COMPLAINT_STATUSES.includes(status.trim())
      ) {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      filter.status = status.trim();
    }

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .populate("asset", "assetId name");

    res.json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid complaint ID" });
    }

    const complaint = await Complaint.findById(id)
      .populate("asset", "assetId name category building location")
      .populate("submittedBy", "name email")
      .populate("assignedTo", "name")
      .populate("statusHistory.changedBy", "name");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const currentUserId = req.user._id.toString();
    const isOwner = complaint.submittedBy?._id?.toString() === currentUserId;
    const isAdmin = req.user.role === "admin";
    const isAssignedTech =
      req.user.role === "technician" &&
      complaint.assignedTo?._id?.toString() === currentUserId;

    if (!isOwner && !isAdmin && !isAssignedTech) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    res.json(complaint);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
