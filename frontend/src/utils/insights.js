/**
 * Pure function that generates deterministic, rule-based statistical insights
 * from analytics summary data. These are statistics calculated using fixed rules,
 * not predictions or AI.
 *
 * @param {Object} summary - The analytics summary payload.
 * @returns {Array<{ id: string, type: string, text: string }>}
 */
export function buildInsights(summary) {
  if (!summary || !summary.totals) {
    return [];
  }

  const total = summary.totals.complaints || 0;
  if (total === 0) {
    return [];
  }

  const insights = [];

  // 1. Location insight: top byLocation entry that is not "Unspecified" or "Others", if count >= 2
  const topLocation = (summary.byLocation || []).find(
    (item) => item.location !== "Unspecified" && item.location !== "Others"
  );
  if (topLocation && topLocation.count >= 2) {
    const pct = Math.round((topLocation.count / total) * 100);
    insights.push({
      id: "location",
      type: "Location",
      text: `${topLocation.location} has the most reported complaints: ${topLocation.count} of ${total} (${pct}%).`,
    });
  }

  // 2. Recurring asset insight: frequentAssets[0] if count >= 2
  const topAsset = summary.frequentAssets?.[0];
  if (topAsset && topAsset.count >= 2) {
    insights.push({
      id: "recurring-asset",
      type: "Recurring asset",
      text: `${topAsset.assetId} (${topAsset.name}) has been reported ${topAsset.count} times.`,
    });
  }

  // 3. Category share insight: largest category excluding "Not analysed", if count >= 2
  const validCategories = (summary.byCategory || [])
    .filter((c) => c.category !== "Not analysed")
    .sort((a, b) => b.count - a.count);
  const topCategory = validCategories[0];
  if (topCategory && topCategory.count >= 2) {
    const pct = Math.round((topCategory.count / total) * 100);
    insights.push({
      id: "category-share",
      type: "Category share",
      text: `${topCategory.category} is the largest category: ${topCategory.count} complaints (${pct}% of all).`,
    });
  }

  // 4. Severity mix insight: High plus Critical count > 0
  const highCount =
    (summary.bySeverity || []).find((s) => s.severity === "High")?.count || 0;
  const critCount =
    (summary.bySeverity || []).find((s) => s.severity === "Critical")?.count || 0;
  const highPlusCrit = highCount + critCount;
  if (highPlusCrit > 0) {
    insights.push({
      id: "severity-mix",
      type: "Severity mix",
      text: `${highPlusCrit} of ${total} complaints are rated High or Critical severity.`,
    });
  }

  // 5. Review backlog insight: byStatus Submitted > 0
  const submittedCount =
    (summary.byStatus || []).find((s) => s.status === "Submitted")?.count || 0;
  if (submittedCount > 0) {
    insights.push({
      id: "review-backlog",
      type: "Review backlog",
      text: `${submittedCount} complaint(s) waiting for admin review.`,
    });
  }

  // 6. Resolution time insight: when averageResolutionHours is not null
  const avgHours = summary.resolution?.averageResolutionHours;
  if (avgHours !== null && avgHours !== undefined) {
    insights.push({
      id: "resolution-time",
      type: "Resolution time",
      text: `Resolved complaints took about ${avgHours} hours from submission on average.`,
    });
  }

  return insights;
}
