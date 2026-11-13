import mongoose from "mongoose";
import Complaint from "../models/Complaint.js";
import MaintenanceRecord from "../models/MaintenanceRecord.js";
import { COMPLAINT_STATUSES } from "../constants/complaints.js";

function populateComplaintQuery(query) {
  return query
    .populate("asset", "assetId name category building location")
    .populate("submittedBy", "name email")
    .populate("assignedTo", "name")
    .populate("reviewedBy", "name")
    .populate("assignedBy", "name")
    .populate("statusHistory.changedBy", "name");
}

export const getAssignedComplaints = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { assignedTo: req.user._id };

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
      .populate("asset", "assetId name category building location")
      .populate("submittedBy", "name");

    res.json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const startComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid complaint ID" });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint || complaint.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (complaint.status !== "Assigned") {
      return res
        .status(400)
        .json({ message: "Only assigned complaints can be started" });
    }

    complaint.status = "In Progress";
    complaint.statusHistory.push({
      status: "In Progress",
      changedBy: req.user._id,
      note: "Work started",
    });

    await complaint.save();

    const populated = await populateComplaintQuery(Complaint.findById(id));
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const resolveComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid complaint ID" });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint || complaint.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (complaint.status !== "In Progress") {
      return res
        .status(400)
        .json({ message: "Start the work before resolving" });
    }

    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res
        .status(400)
        .json({ message: "Request body must be a JSON object" });
    }

    const { diagnosis, actionTaken, resolutionDetails, partsUsed, notes, cost } = body;

    if (typeof diagnosis !== "string" || !diagnosis.trim()) {
      return res.status(400).json({ message: "Diagnosis is required" });
    }
    const cleanDiagnosis = diagnosis.trim();
    if (cleanDiagnosis.length > 1000) {
      return res
        .status(400)
        .json({ message: "Diagnosis must be 1000 characters or fewer" });
    }

    if (typeof actionTaken !== "string" || !actionTaken.trim()) {
      return res.status(400).json({ message: "Action taken is required" });
    }
    const cleanActionTaken = actionTaken.trim();
    if (cleanActionTaken.length > 1000) {
      return res
        .status(400)
        .json({ message: "Action taken must be 1000 characters or fewer" });
    }

    if (typeof resolutionDetails !== "string" || !resolutionDetails.trim()) {
      return res
        .status(400)
        .json({ message: "Resolution details are required" });
    }
    const cleanResolutionDetails = resolutionDetails.trim();
    if (cleanResolutionDetails.length > 1000) {
      return res
        .status(400)
        .json({ message: "Resolution details must be 1000 characters or fewer" });
    }

    let cleanPartsUsed = "";
    if (partsUsed !== undefined && partsUsed !== null) {
      if (typeof partsUsed !== "string") {
        return res.status(400).json({ message: "Parts used must be a string" });
      }
      cleanPartsUsed = partsUsed.trim();
      if (cleanPartsUsed.length > 500) {
        return res
          .status(400)
          .json({ message: "Parts used must be 500 characters or fewer" });
      }
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

    let cleanCost = 0;
    if (cost !== undefined && cost !== null) {
      if (
        typeof cost !== "number" ||
        !Number.isFinite(cost) ||
        cost < 0 ||
        cost > 10000000
      ) {
        return res.status(400).json({
          message: "Cost must be a finite number between 0 and 10,000,000",
        });
      }
      cleanCost = cost;
    }

    const recordData = {
      complaint: complaint._id,
      technician: req.user._id,
      diagnosis: cleanDiagnosis,
      actionTaken: cleanActionTaken,
      resolutionDetails: cleanResolutionDetails,
      cost: cleanCost,
      completedAt: new Date(),
    };

    if (complaint.asset) {
      recordData.asset = complaint.asset;
    }
    if (cleanPartsUsed) {
      recordData.partsUsed = cleanPartsUsed;
    }
    if (cleanNotes) {
      recordData.notes = cleanNotes;
    }

    let maintenanceRecord;
    try {
      maintenanceRecord = await MaintenanceRecord.create(recordData);
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({
          message: "Maintenance record already exists for this complaint",
        });
      }
      throw err;
    }

    complaint.status = "Resolved";
    complaint.statusHistory.push({
      status: "Resolved",
      changedBy: req.user._id,
      note: `Resolved by ${req.user.name}`,
    });

    await complaint.save();

    const populatedComplaint = await populateComplaintQuery(
      Complaint.findById(id)
    );

    res.status(201).json({
      complaint: populatedComplaint,
      maintenance: maintenanceRecord,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
