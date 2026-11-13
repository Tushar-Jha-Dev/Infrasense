import Asset from "../models/Asset.js";
import Complaint from "../models/Complaint.js";
import MaintenanceRecord from "../models/MaintenanceRecord.js";
import { CATEGORIES } from "../constants/categories.js";
import { COMPLAINT_STATUSES, SEVERITIES } from "../constants/complaints.js";

const round2 = (val) => Math.round((Number(val) + Number.EPSILON) * 100) / 100;

export const getAnalyticsSummary = async (req, res) => {
  try {
    // 1. Group complaints by status
    const statusAggPromise = Complaint.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // 2. Group complaints by effective category
    const categoryAggPromise = Complaint.aggregate([
      {
        $project: {
          effectiveCategory: {
            $cond: [
              {
                $and: [
                  { $ne: [{ $ifNull: ["$confirmedCategory", ""] }, ""] },
                ],
              },
              "$confirmedCategory",
              {
                $cond: [
                  {
                    $and: [
                      { $ne: [{ $ifNull: ["$aiAnalysis.category", ""] }, ""] },
                    ],
                  },
                  "$aiAnalysis.category",
                  "Not analysed",
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$effectiveCategory",
          count: { $sum: 1 },
        },
      },
    ]);

    // 3. Group complaints by effective severity
    const severityAggPromise = Complaint.aggregate([
      {
        $project: {
          effectiveSeverity: {
            $cond: [
              {
                $and: [
                  { $ne: [{ $ifNull: ["$confirmedSeverity", ""] }, ""] },
                ],
              },
              "$confirmedSeverity",
              {
                $cond: [
                  {
                    $and: [
                      { $ne: [{ $ifNull: ["$aiAnalysis.severity", ""] }, ""] },
                    ],
                  },
                  "$aiAnalysis.severity",
                  "Not analysed",
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$effectiveSeverity",
          count: { $sum: 1 },
        },
      },
    ]);

    // 4. Overall cost summary from MaintenanceRecord
    const costAggPromise = MaintenanceRecord.aggregate([
      {
        $group: {
          _id: null,
          totalCost: { $sum: "$cost" },
          recordCount: { $sum: 1 },
        },
      },
    ]);

    // 5. Cost grouped by the effective category of the linked complaint
    const costByCategoryPromise = MaintenanceRecord.aggregate([
      {
        $lookup: {
          from: "complaints",
          localField: "complaint",
          foreignField: "_id",
          as: "complaintDoc",
        },
      },
      {
        $unwind: {
          path: "$complaintDoc",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          effectiveCategory: {
            $cond: [
              {
                $and: [
                  {
                    $ne: [
                      { $ifNull: ["$complaintDoc.confirmedCategory", ""] },
                      "",
                    ],
                  },
                ],
              },
              "$complaintDoc.confirmedCategory",
              {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: [
                          {
                            $ifNull: [
                              "$complaintDoc.aiAnalysis.category",
                              "",
                            ],
                          },
                          "",
                        ],
                      },
                    ],
                  },
                  "$complaintDoc.aiAnalysis.category",
                  "Not analysed",
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$effectiveCategory",
          totalCost: { $sum: "$cost" },
        },
      },
      {
        $sort: { totalCost: -1, _id: 1 },
      },
    ]);

    // 6. Top 5 frequent assets by complaint count (ignoring complaints without an asset)
    const frequentAssetsPromise = Complaint.aggregate([
      {
        $match: {
          asset: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$asset",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "assets",
          localField: "_id",
          foreignField: "_id",
          as: "assetDoc",
        },
      },
      {
        $unwind: "$assetDoc",
      },
      {
        $project: {
          _id: 1,
          assetId: "$assetDoc.assetId",
          name: "$assetDoc.name",
          building: "$assetDoc.building",
          count: 1,
        },
      },
      {
        $sort: { count: -1, assetId: 1 },
      },
      {
        $limit: 5,
      },
    ]);

    // 7. Total count of assets
    const totalAssetsPromise = Asset.countDocuments();

    const [
      statusAgg,
      categoryAgg,
      severityAgg,
      costAgg,
      costByCategoryAgg,
      frequentAssets,
      totalAssets,
    ] = await Promise.all([
      statusAggPromise,
      categoryAggPromise,
      severityAggPromise,
      costAggPromise,
      costByCategoryPromise,
      frequentAssetsPromise,
      totalAssetsPromise,
    ]);

    // Build byStatus: all six statuses in lifecycle order with zeros included
    const statusMap = new Map(statusAgg.map((item) => [item._id, item.count]));
    const byStatus = COMPLAINT_STATUSES.map((status) => ({
      status,
      count: statusMap.get(status) || 0,
    }));

    // Compute totals
    const totalComplaints = byStatus.reduce((sum, item) => sum + item.count, 0);
    const openComplaints = byStatus
      .filter((item) => !["Resolved", "Closed"].includes(item.status))
      .reduce((sum, item) => sum + item.count, 0);
    const resolvedComplaints = byStatus
      .filter((item) => ["Resolved", "Closed"].includes(item.status))
      .reduce((sum, item) => sum + item.count, 0);

    const totals = {
      complaints: totalComplaints,
      openComplaints,
      resolvedComplaints,
      assets: totalAssets,
    };

    // Build byCategory: all CATEGORIES with zeros included, plus "Not analysed" if count > 0
    const categoryMap = new Map(
      categoryAgg.map((item) => [item._id, item.count])
    );
    const byCategory = CATEGORIES.map((category) => ({
      category,
      count: categoryMap.get(category) || 0,
    }));
    const notAnalysedCategoryCount = categoryMap.get("Not analysed") || 0;
    if (notAnalysedCategoryCount > 0) {
      byCategory.push({
        category: "Not analysed",
        count: notAnalysedCategoryCount,
      });
    }

    // Build bySeverity: Low, Medium, High, Critical with zeros included, plus "Not analysed" if count > 0
    const severityMap = new Map(
      severityAgg.map((item) => [item._id, item.count])
    );
    const bySeverity = SEVERITIES.map((severity) => ({
      severity,
      count: severityMap.get(severity) || 0,
    }));
    const notAnalysedSeverityCount = severityMap.get("Not analysed") || 0;
    if (notAnalysedSeverityCount > 0) {
      bySeverity.push({
        severity: "Not analysed",
        count: notAnalysedSeverityCount,
      });
    }

    // Build cost summary: totalCost, averageCost (null if 0 records), recordCount
    const recordCount = costAgg[0]?.recordCount || 0;
    const rawTotalCost = costAgg[0]?.totalCost || 0;
    const totalCost = round2(rawTotalCost);
    const averageCost =
      recordCount > 0 ? round2(rawTotalCost / recordCount) : null;

    const cost = {
      totalCost,
      averageCost,
      recordCount,
    };

    // Build costByCategory: only categories with records
    const costByCategory = costByCategoryAgg.map((item) => ({
      category: item._id,
      totalCost: round2(item.totalCost || 0),
    }));

    res.json({
      totals,
      byStatus,
      byCategory,
      bySeverity,
      cost,
      costByCategory,
      frequentAssets,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
