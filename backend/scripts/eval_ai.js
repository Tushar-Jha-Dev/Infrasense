import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { CATEGORIES } from "../constants/categories.js";
import { SEVERITIES } from "../constants/complaints.js";
import {
  analyzeWithRules,
  callGeminiAnalysis,
  applySeverityFloor,
  mergeHybridAnalysis,
} from "../services/aiAnalysis.js";

// Load environment variables (.env in backend or root)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const RESULTS_DIR = path.join(__dirname, "results");
const EVAL_CASES_PATH = path.join(DATA_DIR, "eval_cases.json");

const RESULTS_JSON_PATH = path.join(RESULTS_DIR, "eval_ai_results.json");
const RESULTS_CSV_PATH = path.join(RESULTS_DIR, "eval_ai_results.csv");
const SUMMARY_JSON_PATH = path.join(RESULTS_DIR, "eval_ai_summary.json");

const SEVERITY_ORDER = ["Low", "Medium", "High", "Critical"];
const SEVERITY_RANK = { Low: 0, Medium: 1, High: 2, Critical: 3 };
const CATEGORY_ORDER = [
  "Electrical",
  "Plumbing",
  "Furniture",
  "HVAC",
  "Civil/Structural",
  "Networking",
  "Sanitation",
  "Other",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err) {
  if (err?.status === 429 || (err?.status >= 500 && err?.status <= 599)) {
    return true;
  }
  const msg = String(err?.message || "");
  return /HTTP\s+(429|5\d\d)\b/i.test(msg);
}

function calculatePercentile(sortedValues, p) {
  if (!sortedValues || sortedValues.length === 0) return 0;
  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return Math.round(sortedValues[lower] * 100) / 100;
  }
  const weight = index - lower;
  return (
    Math.round(
      (sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight) * 100
    ) / 100
  );
}

function formatPercent(count, total) {
  if (!total) return "0.0%";
  return `${((count / total) * 100).toFixed(1)}%`;
}

function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function computeConfigMetrics(cases, configKey) {
  const total = cases.length;
  if (total === 0) {
    return null;
  }

  const llmFailedCount = cases.filter((c) => c.llm_failed).length;

  let needsReviewCount = 0;
  if (configKey === "rules") {
    needsReviewCount = cases.filter((c) => c.rules?.needsReview).length;
  } else if (configKey === "hybrid") {
    needsReviewCount = cases.filter((c) => c.needsReview).length;
  } else if (configKey === "llm") {
    needsReviewCount = llmFailedCount;
  }

  const catMatchCount = cases.filter(
    (c) => c[configKey] && c[configKey].category === c.expected.category
  ).length;

  const sevMatchCount = cases.filter(
    (c) => c[configKey] && c[configKey].severity === c.expected.severity
  ).length;

  const bothMatchCount = cases.filter(
    (c) =>
      c[configKey] &&
      c[configKey].category === c.expected.category &&
      c[configKey].severity === c.expected.severity
  ).length;

  // 8x8 Category confusion matrix: rows = expected, cols = predicted
  const catMatrix = CATEGORY_ORDER.map(() =>
    CATEGORY_ORDER.map(() => 0)
  );

  for (const c of cases) {
    const expIdx = CATEGORY_ORDER.indexOf(c.expected.category);
    const predCat = c[configKey]?.category;
    const predIdx = CATEGORY_ORDER.indexOf(predCat);
    if (expIdx !== -1 && predIdx !== -1) {
      catMatrix[expIdx][predIdx] += 1;
    }
  }

  // Category precision, recall, F1 (macro)
  const categoryStats = [];
  let sumPrecision = 0;
  let sumRecall = 0;
  let sumF1 = 0;

  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    const catName = CATEGORY_ORDER[i];
    const tp = catMatrix[i][i];
    let fp = 0;
    let fn = 0;
    for (let r = 0; r < CATEGORY_ORDER.length; r++) {
      if (r !== i) fp += catMatrix[r][i];
    }
    for (let col = 0; col < CATEGORY_ORDER.length; col++) {
      if (col !== i) fn += catMatrix[i][col];
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 =
      precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;

    categoryStats.push({
      category: catName,
      tp,
      fp,
      fn,
      precision: Math.round(precision * 10000) / 10000,
      recall: Math.round(recall * 10000) / 10000,
      f1: Math.round(f1 * 10000) / 10000,
    });

    sumPrecision += precision;
    sumRecall += recall;
    sumF1 += f1;
  }

  const macroPrecision =
    Math.round((sumPrecision / CATEGORY_ORDER.length) * 10000) / 10000;
  const macroRecall =
    Math.round((sumRecall / CATEGORY_ORDER.length) * 10000) / 10000;
  const macroF1 =
    Math.round((sumF1 / CATEGORY_ORDER.length) * 10000) / 10000;

  // 4x4 Severity confusion matrix: rows = expected, cols = predicted
  const sevMatrix = SEVERITY_ORDER.map(() =>
    SEVERITY_ORDER.map(() => 0)
  );

  let underRated = 0;
  let overRated = 0;
  let exactSeverity = 0;
  let underRatedHighCrit = 0;
  let overRatedHighCrit = 0;

  for (const c of cases) {
    const expSev = c.expected.severity;
    const predSev = c[configKey]?.severity;
    const expIdx = SEVERITY_ORDER.indexOf(expSev);
    const predIdx = SEVERITY_ORDER.indexOf(predSev);

    if (expIdx !== -1 && predIdx !== -1) {
      sevMatrix[expIdx][predIdx] += 1;
      const expRank = SEVERITY_RANK[expSev];
      const predRank = SEVERITY_RANK[predSev];

      if (predRank < expRank) {
        underRated += 1;
        if (expSev === "High" || expSev === "Critical") {
          underRatedHighCrit += 1;
        }
      } else if (predRank > expRank) {
        overRated += 1;
        if (expSev === "High" || expSev === "Critical") {
          overRatedHighCrit += 1;
        }
      } else {
        exactSeverity += 1;
      }
    } else {
      // If prediction missing or unmapped
      underRated += 1;
      if (expSev === "High" || expSev === "Critical") {
        underRatedHighCrit += 1;
      }
    }
  }

  // Latency metrics
  const latencies = cases
    .map((c) => c.latency_ms?.[configKey])
    .filter((v) => typeof v === "number" && !isNaN(v))
    .sort((a, b) => a - b);

  let latencyMean = 0;
  let latencyP50 = 0;
  let latencyP95 = 0;

  if (latencies.length > 0) {
    const sum = latencies.reduce((acc, v) => acc + v, 0);
    latencyMean = Math.round((sum / latencies.length) * 100) / 100;
    latencyP50 = calculatePercentile(latencies, 0.5);
    latencyP95 = calculatePercentile(latencies, 0.95);
  }

  return {
    total_cases: total,
    llm_failed: llmFailedCount,
    needsReview: {
      count: needsReviewCount,
      rate_percent: Math.round((needsReviewCount / total) * 1000) / 10,
    },
    accuracy: {
      category: {
        count: catMatchCount,
        percentage: Math.round((catMatchCount / total) * 1000) / 10,
      },
      severity: {
        count: sevMatchCount,
        percentage: Math.round((sevMatchCount / total) * 1000) / 10,
      },
      both: {
        count: bothMatchCount,
        percentage: Math.round((bothMatchCount / total) * 1000) / 10,
      },
    },
    macro_metrics: {
      category: {
        precision: macroPrecision,
        recall: macroRecall,
        f1: macroF1,
      },
    },
    severity_ratings: {
      under_rated: {
        count: underRated,
        percentage: Math.round((underRated / total) * 1000) / 10,
      },
      over_rated: {
        count: overRated,
        percentage: Math.round((overRated / total) * 1000) / 10,
      },
      exact: {
        count: exactSeverity,
        percentage: Math.round((exactSeverity / total) * 1000) / 10,
      },
      under_rated_high_critical: {
        count: underRatedHighCrit,
      },
      over_rated_high_critical: {
        count: overRatedHighCrit,
      },
    },
    severity_confusion_matrix: {
      labels: SEVERITY_ORDER,
      matrix: sevMatrix,
    },
    category_confusion_matrix: {
      labels: CATEGORY_ORDER,
      matrix: catMatrix,
    },
    latency_ms: {
      mean: latencyMean,
      p50: latencyP50,
      p95: latencyP95,
    },
  };
}

async function runEvaluation() {
  console.log("================================================================================");
  console.log("                   InfraSense AI Module Evaluation Script                      ");
  console.log("================================================================================\n");

  // Ensure directories exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // Verify input file exists
  if (!fs.existsSync(EVAL_CASES_PATH)) {
    console.error(`[eval_ai] Error: Test cases file not found at:`);
    console.error(`  ${EVAL_CASES_PATH}`);
    console.error(`Please place the 96 eval_cases.json file into backend/scripts/data/ and re-run.\n`);
    process.exit(1);
  }

  let rawData;
  try {
    rawData = fs.readFileSync(EVAL_CASES_PATH, "utf-8");
  } catch (err) {
    console.error(`[eval_ai] Error reading eval_cases.json:`, err.message);
    process.exit(1);
  }

  let evalCases;
  try {
    evalCases = JSON.parse(rawData);
  } catch (err) {
    console.error(`[eval_ai] Error parsing eval_cases.json:`, err.message);
    process.exit(1);
  }

  if (!Array.isArray(evalCases) || evalCases.length === 0) {
    console.error(`[eval_ai] Error: eval_cases.json must contain a non-empty array of test cases.`);
    process.exit(1);
  }

  const totalCases = evalCases.length;
  console.log(`Loaded ${totalCases} test cases from ${EVAL_CASES_PATH}`);

  const apiKey =
    typeof process.env.LLM_API_KEY === "string" ? process.env.LLM_API_KEY.trim() : "";
  const model =
    typeof process.env.LLM_MODEL === "string" && process.env.LLM_MODEL.trim()
      ? process.env.LLM_MODEL.trim()
      : "gemini-1.5-flash";
  const timeoutMs =
    Number(process.env.LLM_TIMEOUT_MS) > 0 ? Number(process.env.LLM_TIMEOUT_MS) : 8000;
  const evalDelayMs =
    Number(process.env.EVAL_DELAY_MS) >= 0 ? Number(process.env.EVAL_DELAY_MS) : 4000;

  const runLlm = Boolean(apiKey);

  if (!runLlm) {
    console.log("\n[eval_ai] NOTICE: LLM_API_KEY is not set.");
    console.log("[eval_ai] Running Configuration A (rules) ONLY.\n");
  } else {
    console.log(`[eval_ai] LLM configured: model="${model}", timeout=${timeoutMs}ms, delay=${evalDelayMs}ms`);
    console.log("[eval_ai] Running Configurations A (rules), B (llm), and C (hybrid).\n");
  }

  const results = [];
  const maxRetries = 3;

  for (let index = 0; index < totalCases; index++) {
    const item = evalCases[index];
    const caseId = item.id || `C${String(index + 1).padStart(3, "0")}`;

    // 1. Configuration A: Rules
    const t0Rules = performance.now();
    const rulesResult = analyzeWithRules({
      title: item.title,
      description: item.description,
      assetCategory: item.assetCategory,
    });
    const rulesLatencyMs = Math.round((performance.now() - t0Rules) * 100) / 100;

    let llmResult = null;
    let llmFailed = false;
    let retries = 0;
    let llmLatencyMs = null;
    let hybridResult = null;
    let hybridLatencyMs = rulesLatencyMs;

    // 2. Configuration B & C: LLM + Hybrid (if API key available)
    if (runLlm) {
      if (index > 0 && evalDelayMs > 0) {
        await sleep(evalDelayMs);
      }

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const t0Llm = performance.now();
        try {
          llmResult = await callGeminiAnalysis({
            title: item.title,
            description: item.description,
            assetCategory: item.assetCategory,
            timeoutMs,
            apiKey,
            model,
          });
          llmLatencyMs = Math.round((performance.now() - t0Llm) * 100) / 100;
          llmFailed = false;
          break;
        } catch (err) {
          llmLatencyMs = Math.round((performance.now() - t0Llm) * 100) / 100;
          if (isRetryableError(err) && attempt < maxRetries) {
            retries += 1;
            const backoffMs = Math.min(2000 * Math.pow(2, attempt), 10000);
            await sleep(backoffMs);
            continue;
          } else {
            llmFailed = true;
            llmResult = null;
            break;
          }
        }
      }

      // Configuration C: Hybrid
      const t0Merge = performance.now();
      if (llmFailed || !llmResult) {
        hybridResult = {
          category: rulesResult.category,
          severity: rulesResult.severity,
          possibleCauses: rulesResult.possibleCauses,
          source: "rules",
          needsReview: Boolean(rulesResult.needsReview),
        };
      } else {
        hybridResult = mergeHybridAnalysis(rulesResult, llmResult);
      }
      const mergeLatencyMs = performance.now() - t0Merge;
      hybridLatencyMs =
        Math.round((rulesLatencyMs + (llmLatencyMs || 0) + mergeLatencyMs) * 100) /
        100;
    } else {
      // LLM not running: Hybrid falls back to rules
      hybridResult = {
        category: rulesResult.category,
        severity: rulesResult.severity,
        possibleCauses: rulesResult.possibleCauses,
        source: "rules",
        needsReview: Boolean(rulesResult.needsReview),
      };
    }

    const caseRecord = {
      id: caseId,
      group: item.group || "standard",
      borderline: Boolean(item.borderline),
      expected: {
        category: item.expectedCategory,
        severity: item.expectedSeverity,
      },
      rules: {
        category: rulesResult.category,
        severity: rulesResult.severity,
        needsReview: Boolean(rulesResult.needsReview),
      },
      llm: llmResult
        ? {
            category: llmResult.category,
            severity: llmResult.severity,
          }
        : null,
      hybrid: {
        category: hybridResult.category,
        severity: hybridResult.severity,
      },
      llm_failed: llmFailed,
      retries,
      latency_ms: {
        rules: rulesLatencyMs,
        llm: llmLatencyMs,
        hybrid: hybridLatencyMs,
      },
      needsReview: Boolean(hybridResult.needsReview),
      source: hybridResult.source,
    };

    results.push(caseRecord);

    // Progress display
    let progressTag = "ok";
    if (runLlm) {
      if (llmFailed) {
        progressTag = "llm_failed";
      } else if (retries > 0) {
        progressTag = `ok (retries: ${retries})`;
      }
    }
    console.log(`[${index + 1}/${totalCases}] ${caseId} ... ${progressTag}`);
  }

  console.log("\nEvaluation completed. Generating summary and writing output files...\n");

  // Determine all unique groups
  const groupNames = Array.from(new Set(results.map((r) => r.group)));

  // Build configuration metrics
  const configsToEvaluate = runLlm ? ["rules", "llm", "hybrid"] : ["rules"];
  const summaryConfigurations = {};

  for (const cfg of configsToEvaluate) {
    const overallMetrics = computeConfigMetrics(results, cfg);
    const byGroup = {};
    for (const grp of groupNames) {
      const groupCases = results.filter((r) => r.group === grp);
      byGroup[grp] = computeConfigMetrics(groupCases, cfg);
    }
    summaryConfigurations[cfg] = {
      overall: overallMetrics,
      by_group: byGroup,
    };
  }

  // Injection group specific analysis
  const injectionCases = results
    .filter((r) => r.group === "injection")
    .map((r) => ({
      id: r.id,
      expectedSeverity: r.expected.severity,
      rulesSeverity: r.rules.severity,
      llmSeverity: r.llm?.severity ?? "FAILED/N/A",
      hybridSeverity: r.hybrid.severity,
      defended:
        SEVERITY_RANK[r.hybrid.severity] >= SEVERITY_RANK[r.expected.severity],
    }));

  const fullSummary = {
    generatedAt: new Date().toISOString(),
    totalCases,
    llmConfigured: runLlm,
    modelName: runLlm ? model : null,
    configurations: summaryConfigurations,
    injection_group_analysis: injectionCases,
  };

  // Write eval_ai_results.json
  fs.writeFileSync(RESULTS_JSON_PATH, JSON.stringify(results, null, 2), "utf-8");
  console.log(`- Saved results JSON : ${RESULTS_JSON_PATH}`);

  // Write eval_ai_results.csv
  const csvHeaders = [
    "id",
    "group",
    "borderline",
    "expected_category",
    "expected_severity",
    "rules_category",
    "rules_severity",
    "llm_category",
    "llm_severity",
    "hybrid_category",
    "hybrid_severity",
    "llm_failed",
    "retries",
    "latency_rules_ms",
    "latency_llm_ms",
    "latency_hybrid_ms",
    "needsReview",
    "source",
  ];

  const csvRows = [csvHeaders.join(",")];
  for (const r of results) {
    const row = [
      escapeCsv(r.id),
      escapeCsv(r.group),
      escapeCsv(r.borderline),
      escapeCsv(r.expected.category),
      escapeCsv(r.expected.severity),
      escapeCsv(r.rules?.category),
      escapeCsv(r.rules?.severity),
      escapeCsv(r.llm?.category),
      escapeCsv(r.llm?.severity),
      escapeCsv(r.hybrid?.category),
      escapeCsv(r.hybrid?.severity),
      escapeCsv(r.llm_failed),
      escapeCsv(r.retries),
      escapeCsv(r.latency_ms?.rules),
      escapeCsv(r.latency_ms?.llm),
      escapeCsv(r.latency_ms?.hybrid),
      escapeCsv(r.needsReview),
      escapeCsv(r.source),
    ];
    csvRows.push(row.join(","));
  }
  fs.writeFileSync(RESULTS_CSV_PATH, csvRows.join("\n"), "utf-8");
  console.log(`- Saved results CSV  : ${RESULTS_CSV_PATH}`);

  // Write eval_ai_summary.json
  fs.writeFileSync(
    SUMMARY_JSON_PATH,
    JSON.stringify(fullSummary, null, 2),
    "utf-8"
  );
  console.log(`- Saved summary JSON : ${SUMMARY_JSON_PATH}\n`);

  // Print Console Summary Table
  console.log("==========================================================================================");
  console.log("                               SUMMARY PERFORMANCE TABLE                                  ");
  console.log("==========================================================================================");
  console.log(
    "Config".padEnd(9) +
      "Total".padStart(6) +
      "Cat Acc".padStart(13) +
      "Sev Acc".padStart(13) +
      "Both Acc".padStart(13) +
      "Under(H/C)".padStart(12) +
      "Review %".padStart(11) +
      "p50 Lat(ms)".padStart(14)
  );
  console.log("-".repeat(90));

  for (const cfg of configsToEvaluate) {
    const m = summaryConfigurations[cfg].overall;
    const catAccStr = `${m.accuracy.category.count} (${m.accuracy.category.percentage}%)`;
    const sevAccStr = `${m.accuracy.severity.count} (${m.accuracy.severity.percentage}%)`;
    const bothAccStr = `${m.accuracy.both.count} (${m.accuracy.both.percentage}%)`;
    const underHCStr = `${m.severity_ratings.under_rated_high_critical.count}`;
    const revStr = `${m.needsReview.rate_percent}%`;
    const p50Str = `${m.latency_ms.p50} ms`;

    console.log(
      cfg.padEnd(9) +
        String(m.total_cases).padStart(6) +
        catAccStr.padStart(13) +
        sevAccStr.padStart(13) +
        bothAccStr.padStart(13) +
        underHCStr.padStart(12) +
        revStr.padStart(11) +
        p50Str.padStart(14)
    );
  }
  console.log("==========================================================================================");

  // Group breakdown table
  console.log("\n==========================================================================================");
  console.log("                               PER-GROUP ACCURACY (BOTH)                                  ");
  console.log("==========================================================================================");
  const grpHeader =
    "Group".padEnd(16) +
    "Cases".padStart(6) +
    configsToEvaluate.map((c) => `${c} (Cat/Sev/Both)`.padStart(22)).join("");
  console.log(grpHeader);
  console.log("-".repeat(grpHeader.length));

  for (const grp of groupNames) {
    const grpCount = results.filter((r) => r.group === grp).length;
    let rowStr = grp.padEnd(16) + String(grpCount).padStart(6);
    for (const cfg of configsToEvaluate) {
      const gm = summaryConfigurations[cfg].by_group[grp];
      if (gm) {
        const catP = gm.accuracy.category.percentage;
        const sevP = gm.accuracy.severity.percentage;
        const bothP = gm.accuracy.both.percentage;
        const str = `${catP}% / ${sevP}% / ${bothP}%`;
        rowStr += str.padStart(22);
      } else {
        rowStr += "-".padStart(22);
      }
    }
    console.log(rowStr);
  }
  console.log("==========================================================================================");

  // Injection defense table
  if (injectionCases.length > 0) {
    console.log("\n==========================================================================================");
    console.log("                       PROMPT INJECTION GROUP DEFENSE TABLE                               ");
    console.log("==========================================================================================");
    console.log(
      "Case ID".padEnd(10) +
        "Expected".padEnd(12) +
        "Rules".padEnd(12) +
        "LLM".padEnd(14) +
        "Hybrid".padEnd(12) +
        "Status"
    );
    console.log("-".repeat(70));
    for (const inj of injectionCases) {
      const status = inj.defended ? "SAFE (Defended)" : "VULNERABLE (Downgraded)";
      console.log(
        inj.id.padEnd(10) +
          inj.expectedSeverity.padEnd(12) +
          inj.rulesSeverity.padEnd(12) +
          inj.llmSeverity.padEnd(14) +
          inj.hybridSeverity.padEnd(12) +
          status
      );
    }
    console.log("==========================================================================================\n");
  }
}

runEvaluation().catch((err) => {
  console.error("\n[eval_ai] Unexpected error during evaluation execution:", err);
  process.exit(1);
});
