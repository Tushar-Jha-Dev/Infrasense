import mongoose from "mongoose";
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

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toISTDateString = (date) => {
  const d = new Date(new Date(date).getTime() + 5.5 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

const toISTDateTimeString = (date) => {
  if (!date) return "";
  const d = new Date(new Date(date).getTime() + 5.5 * 60 * 60 * 1000);
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
};

const parseISTDate = (str, isEnd = false) => {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = str.split("-");
  const y = Number(yearStr);
  const m = Number(monthStr);
  const d = Number(dayStr);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const utcCheck = new Date(Date.UTC(y, m - 1, d));
  if (
    utcCheck.getUTCFullYear() !== y ||
    utcCheck.getUTCMonth() !== m - 1 ||
    utcCheck.getUTCDate() !== d
  ) {
    return null;
  }
  const time = isEnd ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${str}T${time}+05:30`);
};

function zeroFillMonths(periodMap, minPeriod, maxPeriod) {
  const result = [];
  let [currY, currM] = minPeriod.split("-").map(Number);
  const [endY, endM] = maxPeriod.split("-").map(Number);

  while (currY < endY || (currY === endY && currM <= endM)) {
    const key = `${currY}-${String(currM).padStart(2, "0")}`;
    const data = periodMap.get(key) || { cost: 0, count: 0 };
    result.push({
      period: key,
      cost: round2(data.cost),
      count: data.count,
    });
    currM++;
    if (currM > 12) {
      currM = 1;
      currY++;
    }
  }
  return result;
}

function zeroFillWeeks(periodMap, minPeriod, maxPeriod) {
  const result = [];
  let curr = new Date(`${minPeriod}T00:00:00+05:30`);
  const end = new Date(`${maxPeriod}T00:00:00+05:30`);

  while (curr.getTime() <= end.getTime()) {
    const key = toISTDateString(curr);
    const data = periodMap.get(key) || { cost: 0, count: 0 };
    result.push({
      period: key,
      cost: round2(data.cost),
      count: data.count,
    });
    curr = new Date(curr.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return result;
}

const ALLOWED_COST_PARAMS = [
  "from",
  "to",
  "category",
  "severity",
  "status",
  "technician",
  "asset",
  "building",
  "minCost",
  "maxCost",
  "search",
  "groupBy",
  "sort",
  "page",
  "limit",
];

const parseCostQueryParams = (query) => {
  for (const key of Object.keys(query)) {
    if (!ALLOWED_COST_PARAMS.includes(key)) {
      return { error: `Unknown query parameter: ${key}` };
    }
    if (typeof query[key] !== "string") {
      return { error: `Invalid ${key} parameter; expected a string` };
    }
  }

  const {
    from,
    to,
    category,
    severity,
    status,
    technician,
    asset,
    building,
    minCost,
    maxCost,
    search,
    groupBy = "month",
    sort = "date",
    page = "1",
    limit = "20",
  } = query;

  let fromDate = null;
  if (from !== undefined) {
    fromDate = parseISTDate(from, false);
    if (!fromDate) {
      return { error: "Invalid 'from' date; expected YYYY-MM-DD" };
    }
  }

  let toDate = null;
  if (to !== undefined) {
    toDate = parseISTDate(to, true);
    if (!toDate) {
      return { error: "Invalid 'to' date; expected YYYY-MM-DD" };
    }
  }

  if (fromDate && toDate && fromDate > toDate) {
    return { error: "'from' date must not be after 'to' date" };
  }

  if (category !== undefined && !CATEGORIES.includes(category)) {
    return {
      error: `Invalid category; must be one of: ${CATEGORIES.join(", ")}`,
    };
  }

  if (severity !== undefined && !SEVERITIES.includes(severity)) {
    return {
      error: `Invalid severity; must be one of: ${SEVERITIES.join(", ")}`,
    };
  }

  if (status !== undefined && !["Resolved", "Closed"].includes(status)) {
    return { error: 'Invalid status; must be "Resolved" or "Closed"' };
  }

  if (technician !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(technician)) {
      return { error: "Invalid technician ID" };
    }
  }

  if (asset !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(asset)) {
      return { error: "Invalid asset ID" };
    }
  }

  if (building !== undefined) {
    if (building.length > 100) {
      return { error: "Building must be 100 characters or fewer" };
    }
  }

  let minNum;
  if (minCost !== undefined) {
    minNum = Number(minCost);
    if (Number.isNaN(minNum) || minNum < 0 || !Number.isFinite(minNum)) {
      return { error: "minCost must be a non-negative finite number" };
    }
  }

  let maxNum;
  if (maxCost !== undefined) {
    maxNum = Number(maxCost);
    if (Number.isNaN(maxNum) || maxNum < 0 || !Number.isFinite(maxNum)) {
      return { error: "maxCost must be a non-negative finite number" };
    }
  }

  if (minNum !== undefined && maxNum !== undefined && minNum > maxNum) {
    return { error: "minCost must not exceed maxCost" };
  }

  if (search !== undefined) {
    if (search.length > 100) {
      return { error: "Search query must be 100 characters or fewer" };
    }
  }

  if (!["month", "week"].includes(groupBy)) {
    return { error: 'groupBy must be "month" or "week"' };
  }

  if (!["date", "cost"].includes(sort)) {
    return { error: 'sort must be "date" or "cost"' };
  }

  const pageNum = Number(page);
  if (!Number.isInteger(pageNum) || pageNum < 1) {
    return { error: "page must be an integer >= 1" };
  }

  const limitNum = Number(limit);
  if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 50) {
    return { error: "limit must be an integer between 1 and 50" };
  }

  return {
    params: {
      from: from || null,
      to: to || null,
      fromDate,
      toDate,
      category: category || null,
      severity: severity || null,
      status: status || null,
      technician: technician || null,
      asset: asset || null,
      building: building !== undefined ? building.trim() : null,
      minCost: minNum !== undefined ? minNum : null,
      maxCost: maxNum !== undefined ? maxNum : null,
      search: search !== undefined ? search.trim() : null,
      groupBy,
      sort,
      page: pageNum,
      limit: limitNum,
    },
  };
};

const buildBasePipeline = (parsedParams) => {
  const {
    fromDate,
    toDate,
    technician,
    asset,
    minCost,
    maxCost,
    category,
    severity,
    status,
    building,
    search,
  } = parsedParams;

  const matchInitial = {};
  if (fromDate || toDate) {
    matchInitial.completedAt = {};
    if (fromDate) matchInitial.completedAt.$gte = fromDate;
    if (toDate) matchInitial.completedAt.$lte = toDate;
  }
  if (technician) {
    matchInitial.technician = new mongoose.Types.ObjectId(technician);
  }
  if (asset) {
    matchInitial.asset = new mongoose.Types.ObjectId(asset);
  }
  if (minCost !== null && minCost !== undefined) {
    matchInitial.cost = matchInitial.cost || {};
    matchInitial.cost.$gte = minCost;
  }
  if (maxCost !== null && maxCost !== undefined) {
    matchInitial.cost = matchInitial.cost || {};
    matchInitial.cost.$lte = maxCost;
  }

  const pipeline = [];
  if (Object.keys(matchInitial).length > 0) {
    pipeline.push({ $match: matchInitial });
  }

  pipeline.push(
    {
      $lookup: {
        from: "complaints",
        localField: "complaint",
        foreignField: "_id",
        as: "complaintDoc",
      },
    },
    {
      $unwind: "$complaintDoc",
    },
    {
      $lookup: {
        from: "assets",
        localField: "asset",
        foreignField: "_id",
        as: "assetDoc",
      },
    },
    {
      $unwind: {
        path: "$assetDoc",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "technician",
        foreignField: "_id",
        pipeline: [{ $project: { _id: 1, name: 1 } }],
        as: "techDoc",
      },
    },
    {
      $unwind: {
        path: "$techDoc",
        preserveNullAndEmptyArrays: true,
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
                          $ifNull: ["$complaintDoc.aiAnalysis.category", ""],
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
        effectiveSeverity: {
          $cond: [
            {
              $and: [
                {
                  $ne: [
                    { $ifNull: ["$complaintDoc.confirmedSeverity", ""] },
                    "",
                  ],
                },
              ],
            },
            "$complaintDoc.confirmedSeverity",
            {
              $cond: [
                {
                  $and: [
                    {
                      $ne: [
                        {
                          $ifNull: ["$complaintDoc.aiAnalysis.severity", ""],
                        },
                        "",
                      ],
                    },
                  ],
                },
                "$complaintDoc.aiAnalysis.severity",
                "Not analysed",
              ],
            },
          ],
        },
      },
    }
  );

  const matchRemaining = {};
  if (category) {
    matchRemaining.effectiveCategory = category;
  }
  if (severity) {
    matchRemaining.effectiveSeverity = severity;
  }
  if (status) {
    matchRemaining["complaintDoc.status"] = status;
  }
  if (building) {
    matchRemaining["assetDoc.building"] = building;
  }
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    matchRemaining.$or = [
      { "complaintDoc.complaintId": searchRegex },
      { "complaintDoc.title": searchRegex },
      { partsUsed: searchRegex },
      { "assetDoc.name": searchRegex },
      { "assetDoc.assetId": searchRegex },
    ];
  }

  if (Object.keys(matchRemaining).length > 0) {
    pipeline.push({ $match: matchRemaining });
  }

  return pipeline;
};

export const getCostDetails = async (req, res) => {
  try {
    const parsed = parseCostQueryParams(req.query);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const { params } = parsed;
    const { fromDate, toDate, groupBy, sort, page, limit } = params;

    const basePipeline = buildBasePipeline(params);

    const sortStage =
      sort === "cost"
        ? { cost: -1, completedAt: -1, _id: -1 }
        : { completedAt: -1, _id: -1 };

    const periodExpr =
      groupBy === "week"
        ? {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $dateTrunc: {
                  date: "$completedAt",
                  unit: "week",
                  binSize: 1,
                  timezone: "Asia/Kolkata",
                  startOfWeek: "monday",
                },
              },
              timezone: "Asia/Kolkata",
            },
          }
        : {
            $dateToString: {
              format: "%Y-%m",
              date: "$completedAt",
              timezone: "Asia/Kolkata",
            },
          };

    const facetStage = {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalCost: { $sum: "$cost" },
              recordCount: { $sum: 1 },
              highestCost: { $max: "$cost" },
            },
          },
        ],
        byPeriod: [
          {
            $group: {
              _id: periodExpr,
              cost: { $sum: "$cost" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        byCategory: [
          {
            $group: {
              _id: "$effectiveCategory",
              cost: { $sum: "$cost" },
              count: { $sum: 1 },
            },
          },
          { $sort: { cost: -1, _id: 1 } },
        ],
        byTechnician: [
          {
            $group: {
              _id: "$techDoc._id",
              name: { $first: "$techDoc.name" },
              cost: { $sum: "$cost" },
              count: { $sum: 1 },
            },
          },
          { $sort: { cost: -1, name: 1 } },
        ],
        byBuilding: [
          {
            $group: {
              _id: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: [{ $ifNull: ["$assetDoc.building", ""] }, ""],
                      },
                    ],
                  },
                  "$assetDoc.building",
                  "No asset or building",
                ],
              },
              cost: { $sum: "$cost" },
              count: { $sum: 1 },
            },
          },
          { $sort: { cost: -1, _id: 1 } },
          { $limit: 8 },
        ],
        byAsset: [
          {
            $match: {
              asset: { $ne: null },
              "assetDoc._id": { $ne: null },
            },
          },
          {
            $group: {
              _id: "$assetDoc._id",
              assetId: { $first: "$assetDoc.assetId" },
              name: { $first: "$assetDoc.name" },
              building: { $first: { $ifNull: ["$assetDoc.building", ""] } },
              cost: { $sum: "$cost" },
              count: { $sum: 1 },
            },
          },
          { $sort: { cost: -1, assetId: 1 } },
          { $limit: 10 },
        ],
        recordsTotal: [{ $count: "total" }],
        recordsItems: [
          { $sort: sortStage },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              completedAt: 1,
              cost: 1,
              partsUsed: { $ifNull: ["$partsUsed", ""] },
              category: "$effectiveCategory",
              severity: "$effectiveSeverity",
              complaint: {
                _id: "$complaintDoc._id",
                complaintId: "$complaintDoc.complaintId",
                title: "$complaintDoc.title",
                status: "$complaintDoc.status",
              },
              asset: {
                $cond: [
                  { $ifNull: ["$assetDoc._id", false] },
                  {
                    _id: "$assetDoc._id",
                    assetId: "$assetDoc.assetId",
                    name: "$assetDoc.name",
                    building: { $ifNull: ["$assetDoc.building", ""] },
                  },
                  null,
                ],
              },
              technician: {
                $cond: [
                  { $ifNull: ["$techDoc._id", false] },
                  {
                    _id: "$techDoc._id",
                    name: "$techDoc.name",
                  },
                  null,
                ],
              },
            },
          },
        ],
      },
    };

    let prevPromise = Promise.resolve([]);
    let prevFromStr = null;
    let prevToStr = null;

    if (fromDate && toDate) {
      const durationMs = toDate.getTime() - fromDate.getTime() + 1;
      const prevToDate = new Date(fromDate.getTime() - 1);
      const prevFromDate = new Date(prevToDate.getTime() - durationMs + 1);
      prevFromStr = toISTDateString(prevFromDate);
      prevToStr = toISTDateString(prevToDate);

      const prevParams = {
        ...params,
        fromDate: prevFromDate,
        toDate: prevToDate,
      };
      const prevPipeline = [
        ...buildBasePipeline(prevParams),
        {
          $group: {
            _id: null,
            totalCost: { $sum: "$cost" },
            recordCount: { $sum: 1 },
          },
        },
      ];
      prevPromise = MaintenanceRecord.aggregate(prevPipeline);
    }

    const [facetResults, prevResults] = await Promise.all([
      MaintenanceRecord.aggregate([...basePipeline, facetStage]),
      prevPromise,
    ]);

    const facetData = facetResults[0] || {};
    const rawSummary = (facetData.summary && facetData.summary[0]) || {
      totalCost: 0,
      recordCount: 0,
      highestCost: null,
    };

    const totalCost = round2(rawSummary.totalCost || 0);
    const recordCount = rawSummary.recordCount || 0;
    const averageCost =
      recordCount > 0 ? round2(totalCost / recordCount) : null;
    const highestCost =
      recordCount > 0 && rawSummary.highestCost !== null
        ? round2(rawSummary.highestCost)
        : null;

    let previous = null;
    if (fromDate && toDate) {
      const rawPrev = (prevResults && prevResults[0]) || {
        totalCost: 0,
        recordCount: 0,
      };
      const prevTotal = round2(rawPrev.totalCost || 0);
      const prevCount = rawPrev.recordCount || 0;
      const change = round2(totalCost - prevTotal);
      const changePercent =
        prevTotal === 0
          ? null
          : round2(((totalCost - prevTotal) / prevTotal) * 100);

      previous = {
        from: prevFromStr,
        to: prevToStr,
        totalCost: prevTotal,
        recordCount: prevCount,
        change,
        changePercent,
      };
    }

    const rawPeriods = facetData.byPeriod || [];
    let byPeriod = [];
    if (rawPeriods.length > 0) {
      const periodMap = new Map();
      for (const item of rawPeriods) {
        if (item._id) {
          periodMap.set(item._id, { cost: item.cost, count: item.count });
        }
      }
      const periods = Array.from(periodMap.keys()).sort();
      if (periods.length > 0) {
        const minPeriod = periods[0];
        const maxPeriod = periods[periods.length - 1];
        byPeriod =
          groupBy === "week"
            ? zeroFillWeeks(periodMap, minPeriod, maxPeriod)
            : zeroFillMonths(periodMap, minPeriod, maxPeriod);
      }
    }

    const byCategory = (facetData.byCategory || []).map((c) => ({
      category: c._id,
      cost: round2(c.cost),
      count: c.count,
    }));

    const byTechnician = (facetData.byTechnician || []).map((t) => ({
      _id: t._id,
      name: t.name || "Unknown",
      cost: round2(t.cost),
      count: t.count,
    }));

    const byBuilding = (facetData.byBuilding || []).map((b) => ({
      building: b._id,
      cost: round2(b.cost),
      count: b.count,
    }));

    const byAsset = (facetData.byAsset || []).map((a) => ({
      _id: a._id,
      assetId: a.assetId,
      name: a.name,
      building: a.building || "",
      cost: round2(a.cost),
      count: a.count,
    }));

    const totalRecords =
      (facetData.recordsTotal &&
        facetData.recordsTotal[0] &&
        facetData.recordsTotal[0].total) ||
      0;
    const totalPages =
      totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;
    const items = (facetData.recordsItems || []).map((item) => ({
      ...item,
      cost: round2(item.cost),
    }));

    res.json({
      filters: {
        from: params.from,
        to: params.to,
        category: params.category,
        severity: params.severity,
        status: params.status,
        technician: params.technician,
        asset: params.asset,
        building: params.building,
        minCost: params.minCost,
        maxCost: params.maxCost,
        search: params.search,
        groupBy: params.groupBy,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
      },
      summary: {
        totalCost,
        recordCount,
        averageCost,
        highestCost,
        previous,
      },
      byPeriod,
      byCategory,
      byTechnician,
      byBuilding,
      byAsset,
      records: {
        page,
        limit,
        total: totalRecords,
        totalPages,
        items,
      },
    });
  } catch (error) {
    console.error("getCostDetails error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const sanitizeCsvCell = (val) => {
  if (val === null || val === undefined) {
    return '""';
  }
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  str = str.replace(/"/g, '""');
  return `"${str}"`;
};

export const exportCostsCsv = async (req, res) => {
  try {
    const parsed = parseCostQueryParams(req.query);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const { params } = parsed;
    const { sort } = params;

    const basePipeline = buildBasePipeline(params);

    const sortStage =
      sort === "cost"
        ? { cost: -1, completedAt: -1, _id: -1 }
        : { completedAt: -1, _id: -1 };

    const records = await MaintenanceRecord.aggregate([
      ...basePipeline,
      { $sort: sortStage },
      { $limit: 5000 },
    ]);

    const header = [
      "Completed (IST, YYYY-MM-DD HH:mm)",
      "Complaint ID",
      "Title",
      "Asset ID",
      "Asset name",
      "Building",
      "Category",
      "Severity",
      "Status",
      "Technician",
      "Parts used",
      "Cost",
    ];

    const rows = records.map((rec) => {
      return [
        sanitizeCsvCell(toISTDateTimeString(rec.completedAt)),
        sanitizeCsvCell(rec.complaintDoc?.complaintId || ""),
        sanitizeCsvCell(rec.complaintDoc?.title || ""),
        sanitizeCsvCell(rec.assetDoc?.assetId || ""),
        sanitizeCsvCell(rec.assetDoc?.name || ""),
        sanitizeCsvCell(rec.assetDoc?.building || ""),
        sanitizeCsvCell(rec.effectiveCategory || ""),
        sanitizeCsvCell(rec.effectiveSeverity || ""),
        sanitizeCsvCell(rec.complaintDoc?.status || ""),
        sanitizeCsvCell(rec.techDoc?.name || ""),
        sanitizeCsvCell(rec.partsUsed || ""),
        sanitizeCsvCell(round2(rec.cost || 0).toFixed(2)),
      ].join(",");
    });

    const csvContent = [
      header.map(sanitizeCsvCell).join(","),
      ...rows,
    ].join("\r\n");

    const todayIST = toISTDateString(new Date());
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="costs-${todayIST}.csv"`
    );
    res.send("\uFEFF" + csvContent);
  } catch (error) {
    console.error("exportCostsCsv error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
