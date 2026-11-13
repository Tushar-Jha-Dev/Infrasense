import Asset from "../models/Asset.js";
import Complaint from "../models/Complaint.js";
import MaintenanceRecord from "../models/MaintenanceRecord.js";
import User from "../models/User.js";
import { CATEGORIES } from "../constants/categories.js";
import { COMPLAINT_STATUSES, SEVERITIES } from "../constants/complaints.js";

const round2 = (val) => Math.round((Number(val) + Number.EPSILON) * 100) / 100;
const round1 = (val) => Math.round((Number(val) + Number.EPSILON) * 10) / 10;

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

    // 8. Monthly metrics (6 months zero-filled, ending with current month in Asia/Kolkata)
    const now = new Date();
    const kolkataFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
    });
    const parts = kolkataFormatter.formatToParts(now);
    const currentYear = parseInt(parts.find((p) => p.type === "year").value, 10);
    const currentMonth = parseInt(parts.find((p) => p.type === "month").value, 10);

    const targetMonths = [];
    for (let i = 5; i >= 0; i--) {
      let y = currentYear;
      let m = currentMonth - i;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      targetMonths.push(`${y}-${String(m).padStart(2, "0")}`);
    }

    const reportedMonthlyPromise = Complaint.aggregate([
      {
        $project: {
          month: {
            $dateToString: {
              date: "$createdAt",
              timezone: "Asia/Kolkata",
              format: "%Y-%m",
            },
          },
        },
      },
      {
        $group: {
          _id: "$month",
          count: { $sum: 1 },
        },
      },
    ]);

    const resolvedMonthlyPromise = Complaint.aggregate([
      {
        $project: {
          resolvedEntries: {
            $filter: {
              input: "$statusHistory",
              as: "item",
              cond: { $eq: ["$$item.status", "Resolved"] },
            },
          },
        },
      },
      {
        $match: {
          "resolvedEntries.0": { $exists: true },
        },
      },
      {
        $project: {
          firstResolvedAt: { $arrayElemAt: ["$resolvedEntries.changedAt", 0] },
        },
      },
      {
        $project: {
          month: {
            $dateToString: {
              date: "$firstResolvedAt",
              timezone: "Asia/Kolkata",
              format: "%Y-%m",
            },
          },
        },
      },
      {
        $group: {
          _id: "$month",
          count: { $sum: 1 },
        },
      },
    ]);

    const costMonthlyPromise = MaintenanceRecord.aggregate([
      {
        $project: {
          cost: 1,
          month: {
            $dateToString: {
              date: "$completedAt",
              timezone: "Asia/Kolkata",
              format: "%Y-%m",
            },
          },
        },
      },
      {
        $group: {
          _id: "$month",
          totalCost: { $sum: "$cost" },
        },
      },
    ]);

    // 9. Resolution statistics
    const resolutionPromise = Complaint.aggregate([
      {
        $project: {
          createdAt: 1,
          resolvedEntries: {
            $filter: {
              input: "$statusHistory",
              as: "item",
              cond: { $eq: ["$$item.status", "Resolved"] },
            },
          },
        },
      },
      {
        $match: {
          "resolvedEntries.0": { $exists: true },
        },
      },
      {
        $project: {
          createdAt: 1,
          firstResolvedAt: { $arrayElemAt: ["$resolvedEntries.changedAt", 0] },
        },
      },
      {
        $project: {
          diffHours: {
            $divide: [
              { $subtract: ["$firstResolvedAt", "$createdAt"] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          resolvedCount: { $sum: 1 },
          avgHours: { $avg: "$diffHours" },
        },
      },
    ]);

    // 10. By Location queries
    const complaintsForLocationPromise = Complaint.find()
      .select("location asset createdAt")
      .populate("asset", "building")
      .sort({ createdAt: 1 })
      .lean();

    // 11. Technicians queries
    const techniciansListPromise = User.find({ role: "technician" })
      .select("_id name isActive")
      .lean();

    const techComplaintsPromise = Complaint.find({
      assignedTo: { $ne: null },
    })
      .select("assignedTo status assignedAt statusHistory")
      .lean();

    const [
      statusAgg,
      categoryAgg,
      severityAgg,
      costAgg,
      costByCategoryAgg,
      frequentAssets,
      totalAssets,
      reportedMonthly,
      resolvedMonthly,
      costMonthly,
      resolutionAgg,
      complaintsForLocation,
      techniciansList,
      techComplaints,
    ] = await Promise.all([
      statusAggPromise,
      categoryAggPromise,
      severityAggPromise,
      costAggPromise,
      costByCategoryPromise,
      frequentAssetsPromise,
      totalAssetsPromise,
      reportedMonthlyPromise,
      resolvedMonthlyPromise,
      costMonthlyPromise,
      resolutionPromise,
      complaintsForLocationPromise,
      techniciansListPromise,
      techComplaintsPromise,
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

    // Build monthly: exactly 6 months
    const reportedMap = new Map(reportedMonthly.map((r) => [r._id, r.count]));
    const resolvedMap = new Map(resolvedMonthly.map((r) => [r._id, r.count]));
    const costMonthMap = new Map(costMonthly.map((r) => [r._id, r.totalCost]));

    const monthly = targetMonths.map((m) => ({
      month: m,
      reported: reportedMap.get(m) || 0,
      resolved: resolvedMap.get(m) || 0,
      cost: round2(costMonthMap.get(m) || 0),
    }));

    // Build resolution: { resolvedCount, averageResolutionHours }
    const resCount = resolutionAgg[0]?.resolvedCount || 0;
    const avgResHours =
      resCount > 0 ? round1(resolutionAgg[0].avgHours) : null;
    const resolution = {
      resolvedCount: resCount,
      averageResolutionHours: avgResHours,
    };

    // Build byLocation: top 7 + Others
    const locationMap = new Map();
    for (const c of complaintsForLocation) {
      let loc = "";
      if (
        c.asset &&
        typeof c.asset.building === "string" &&
        c.asset.building.trim()
      ) {
        loc = c.asset.building.trim();
      } else if (typeof c.location === "string" && c.location.trim()) {
        loc = c.location.trim();
      } else {
        loc = "Unspecified";
      }

      const key = loc.toLowerCase();
      if (!locationMap.has(key)) {
        locationMap.set(key, { location: loc, count: 0 });
      }
      locationMap.get(key).count += 1;
    }

    const sortedLocations = Array.from(locationMap.values()).sort(
      (a, b) => b.count - a.count
    );

    let byLocation = [];
    if (sortedLocations.length <= 7) {
      byLocation = sortedLocations;
    } else {
      const top7 = sortedLocations.slice(0, 7);
      const othersCount = sortedLocations
        .slice(7)
        .reduce((sum, item) => sum + item.count, 0);
      byLocation = [...top7, { location: "Others", count: othersCount }];
    }

    // Build technicians: all users with role "technician"
    const technicians = techniciansList.map((tech) => {
      const myComplaints = techComplaints.filter(
        (c) => c.assignedTo?.toString() === tech._id.toString()
      );

      const resolvedCount = myComplaints.filter((c) =>
        ["Resolved", "Closed"].includes(c.status)
      ).length;

      const activeTasks = myComplaints.filter((c) =>
        ["Assigned", "In Progress"].includes(c.status)
      ).length;

      const diffs = [];
      for (const c of myComplaints) {
        if (c.assignedAt) {
          const firstResolved = (c.statusHistory || []).find(
            (h) => h.status === "Resolved"
          );
          if (firstResolved && firstResolved.changedAt) {
            const diffMs =
              new Date(firstResolved.changedAt).getTime() -
              new Date(c.assignedAt).getTime();
            if (diffMs >= 0) {
              diffs.push(diffMs / (1000 * 60 * 60));
            }
          }
        }
      }

      const averageResolutionHours =
        diffs.length > 0
          ? round1(diffs.reduce((sum, d) => sum + d, 0) / diffs.length)
          : null;

      return {
        _id: tech._id,
        name: tech.name,
        isActive: tech.isActive,
        resolvedCount,
        averageResolutionHours,
        activeTasks,
      };
    });

    technicians.sort((a, b) => {
      if (b.resolvedCount !== a.resolvedCount) {
        return b.resolvedCount - a.resolvedCount;
      }
      return a.name.localeCompare(b.name);
    });

    res.json({
      totals,
      byStatus,
      byCategory,
      bySeverity,
      cost,
      costByCategory,
      frequentAssets,
      monthly,
      resolution,
      byLocation,
      technicians,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
