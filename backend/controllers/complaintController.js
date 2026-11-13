import mongoose from "mongoose";
import Asset from "../models/Asset.js";
import Complaint from "../models/Complaint.js";
import MaintenanceRecord from "../models/MaintenanceRecord.js";
import User from "../models/User.js";
import { CATEGORIES } from "../constants/categories.js";
import { COMPLAINT_STATUSES, SEVERITIES } from "../constants/complaints.js";
import { analyzeComplaint } from "../services/aiAnalysis.js";
import { getNextSequence } from "../utils/sequence.js";
import { sanitizeComplaint } from "../utils/sanitizeComplaint.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function populateComplaintQuery(query) {
  return query
    .populate("asset", "assetId name category building location")
    .populate("submittedBy", "name email")
    .populate("assignedTo", "name")
    .populate("reviewedBy", "name")
    .populate("assignedBy", "name")
    .populate("statusHistory.changedBy", "name");
}

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
    let assetCategory;
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
      assetCategory = existingAsset.category;
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

    try {
      const analysis = await analyzeComplaint({
        title: cleanTitle,
        description: cleanDescription,
        assetCategory,
      });
      if (analysis && typeof analysis === "object") {
        complaintData.aiAnalysis = {
          category: analysis.category,
          severity: analysis.severity,
          possibleCauses: analysis.possibleCauses,
          source: analysis.source,
          needsReview: Boolean(analysis.needsReview),
          analyzedAt: new Date(),
        };
      }
    } catch (analysisError) {
      console.error("Complaint analysis failed:", analysisError);
    }

    const complaint = await Complaint.create(complaintData);
    await complaint.populate("asset", "assetId name");

    res.status(201).json(sanitizeComplaint(complaint, req.user));
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

    res.json(sanitizeComplaint(complaints, req.user));
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

    const complaint = await populateComplaintQuery(Complaint.findById(id));

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

    res.json(sanitizeComplaint(complaint, req.user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


export const listComplaints = async (req, res) => {
  try {
    const { status, severity, category, needsReview, search } = req.query;
    const conditions = [];

    if (status !== undefined) {
      if (typeof status !== "string") {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      const cleanStatus = status.trim();
      if (cleanStatus) {
        if (!COMPLAINT_STATUSES.includes(cleanStatus)) {
          return res.status(400).json({ message: "Invalid status filter" });
        }
        conditions.push({ status: cleanStatus });
      }
    }

    if (severity !== undefined) {
      if (typeof severity !== "string") {
        return res.status(400).json({ message: "Invalid severity filter" });
      }
      const cleanSeverity = severity.trim();
      if (cleanSeverity) {
        if (!SEVERITIES.includes(cleanSeverity)) {
          return res.status(400).json({ message: "Invalid severity filter" });
        }
        conditions.push({
          $or: [
            { confirmedSeverity: cleanSeverity },
            {
              confirmedSeverity: { $in: [null, ""] },
              "aiAnalysis.severity": cleanSeverity,
            },
          ],
        });
      }
    }

    if (category !== undefined) {
      if (typeof category !== "string") {
        return res.status(400).json({ message: "Invalid category filter" });
      }
      const cleanCategory = category.trim();
      if (cleanCategory) {
        if (!CATEGORIES.includes(cleanCategory)) {
          return res.status(400).json({ message: "Invalid category filter" });
        }
        conditions.push({
          $or: [
            { confirmedCategory: cleanCategory },
            {
              confirmedCategory: { $in: [null, ""] },
              "aiAnalysis.category": cleanCategory,
            },
          ],
        });
      }
    }

    if (needsReview !== undefined) {
      if (typeof needsReview !== "string") {
        return res.status(400).json({ message: "Invalid needsReview filter" });
      }
      const cleanNeedsReview = needsReview.trim();
      if (cleanNeedsReview) {
        if (cleanNeedsReview !== "true") {
          return res
            .status(400)
            .json({ message: 'Invalid needsReview filter; use "true"' });
        }
        conditions.push({
          "aiAnalysis.needsReview": true,
          confirmedCategory: { $in: [null, ""] },
          confirmedSeverity: { $in: [null, ""] },
        });
      }
    }

    if (search !== undefined) {
      if (typeof search !== "string") {
        return res.status(400).json({ message: "Invalid search filter" });
      }
      const cleanSearch = search.trim();
      if (cleanSearch) {
        const regex = new RegExp(escapeRegex(cleanSearch), "i");
        conditions.push({
          $or: [{ complaintId: regex }, { title: regex }],
        });
      }
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {};

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .populate("asset", "assetId name")
      .populate("submittedBy", "name")
      .populate("assignedTo", "name");

    res.json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const reviewComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid complaint ID" });
    }

    const body = req.body ?? {};
    if (typeof body !== "object" || Array.isArray(body)) {
      return res
        .status(400)
        .json({ message: "Request body must be a JSON object" });
    }

    const { confirmedCategory, confirmedSeverity } = body;

    if (confirmedCategory !== undefined) {
      if (
        typeof confirmedCategory !== "string" ||
        !CATEGORIES.includes(confirmedCategory.trim())
      ) {
        return res.status(400).json({ message: "Invalid confirmedCategory" });
      }
    }

    if (confirmedSeverity !== undefined) {
      if (
        typeof confirmedSeverity !== "string" ||
        !SEVERITIES.includes(confirmedSeverity.trim())
      ) {
        return res.status(400).json({ message: "Invalid confirmedSeverity" });
      }
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (!["Submitted", "Under Review"].includes(complaint.status)) {
      return res
        .status(400)
        .json({ message: "Complaint can no longer be reviewed" });
    }

    if (confirmedCategory !== undefined) {
      complaint.confirmedCategory = confirmedCategory.trim();
    }
    if (confirmedSeverity !== undefined) {
      complaint.confirmedSeverity = confirmedSeverity.trim();
    }

    complaint.reviewedBy = req.user._id;

    if (complaint.status === "Submitted") {
      complaint.status = "Under Review";
      complaint.statusHistory.push({
        status: "Under Review",
        changedBy: req.user._id,
        note: "Reviewed by admin",
      });
    }

    await complaint.save();
    const populated = await populateComplaintQuery(Complaint.findById(id));
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const assignComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid complaint ID" });
    }

    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res
        .status(400)
        .json({ message: "Request body must be a JSON object" });
    }

    const { technicianId, notes } = body;

    if (
      typeof technicianId !== "string" ||
      !mongoose.Types.ObjectId.isValid(technicianId)
    ) {
      return res.status(400).json({ message: "Valid technicianId is required" });
    }

    let cleanNotes = "";
    if (notes !== undefined && notes !== null) {
      if (typeof notes !== "string") {
        return res.status(400).json({ message: "Notes must be a string" });
      }
      cleanNotes = notes.trim();
      if (cleanNotes.length > 500) {
        return res
          .status(400)
          .json({ message: "Notes must be 500 characters or fewer" });
      }
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (
      !["Submitted", "Under Review", "Assigned"].includes(complaint.status)
    ) {
      return res.status(400).json({
        message: "Complaint cannot be assigned in its current status",
      });
    }

    const technician = await User.findById(technicianId);
    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    if (technician.role !== "technician" || !technician.isActive) {
      return res
        .status(400)
        .json({ message: "Selected user must be an active technician" });
    }

    complaint.assignedTo = technician._id;
    complaint.assignedBy = req.user._id;
    complaint.assignedAt = new Date();
    complaint.assignmentNotes = cleanNotes;
    complaint.status = "Assigned";
    complaint.statusHistory.push({
      status: "Assigned",
      changedBy: req.user._id,
      note: `Assigned to ${technician.name}`,
    });

    await complaint.save();
    const populated = await populateComplaintQuery(Complaint.findById(id));
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const closeComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid complaint ID" });
    }

    const body = req.body ?? {};
    if (typeof body !== "object" || Array.isArray(body)) {
      return res
        .status(400)
        .json({ message: "Request body must be a JSON object" });
    }

    const { note } = body;
    let cleanNote = "";
    if (note !== undefined && note !== null) {
      if (typeof note !== "string") {
        return res.status(400).json({ message: "Note must be a string" });
      }
      cleanNote = note.trim();
      if (cleanNote.length > 300) {
        return res
          .status(400)
          .json({ message: "Note must be 300 characters or fewer" });
      }
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (complaint.status !== "Resolved") {
      return res
        .status(400)
        .json({ message: "Only resolved complaints can be closed" });
    }

    complaint.status = "Closed";
    const historyEntry = {
      status: "Closed",
      changedBy: req.user._id,
    };
    if (cleanNote) {
      historyEntry.note = cleanNote;
    }
    complaint.statusHistory.push(historyEntry);

    await complaint.save();
    const populated = await populateComplaintQuery(Complaint.findById(id));
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getComplaintMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid complaint ID" });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const currentUserId = req.user._id.toString();
    const isOwner = complaint.submittedBy?.toString() === currentUserId;
    const isAdmin = req.user.role === "admin";
    const isAssignedTech =
      req.user.role === "technician" &&
      complaint.assignedTo?.toString() === currentUserId;

    if (!isOwner && !isAdmin && !isAssignedTech) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const maintenance = await MaintenanceRecord.findOne({
      complaint: complaint._id,
    }).populate("technician", "name");

    if (!maintenance) {
      return res.json(null);
    }

    if (isAdmin || isAssignedTech) {
      return res.json(maintenance);
    }

    return res.json({
      resolutionDetails: maintenance.resolutionDetails,
      completedAt: maintenance.completedAt,
      technician: maintenance.technician
        ? { name: maintenance.technician.name }
        : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
