import dotenv from "dotenv";
import { analyzeComplaint, analyzeWithRules } from "../services/aiAnalysis.js";

dotenv.config();

const TEST_CASES = [
  {
    text: "Fan sparking and burning smell from the regulator",
    expectedCategory: "Electrical",
    expectedSeverity: "Critical",
  },
  {
    text: "Wi-Fi not working in the library",
    expectedCategory: "Networking",
    expectedSeverity: "Medium",
  },
  {
    text: "Water leaking from the tap in the washroom",
    expectedCategory: "Plumbing",
    expectedSeverity: "Medium",
  },
  {
    text: "Large crack in wall near the staircase, plaster falling",
    expectedCategory: "Civil/Structural",
    expectedSeverity: "High",
  },
  {
    text: "Paint peeling on the classroom wall",
    expectedCategory: "Civil/Structural",
    expectedSeverity: "Low",
  },
  {
    text: "Chair leg broken in room 204",
    expectedCategory: "Furniture",
    expectedSeverity: "Medium",
  },
  {
    text: "AC not cooling in the seminar hall",
    expectedCategory: "HVAC",
    expectedSeverity: "Medium",
  },
  {
    text: "Tube light flickering in the corridor",
    expectedCategory: "Electrical",
    expectedSeverity: "Medium",
  },
  {
    text: "Something is wrong",
    expectedCategory: "Other",
    expectedSeverity: "Medium",
  },
  {
    text: "Fans are not working in room 12",
    expectedCategory: "Electrical",
    expectedSeverity: "Medium",
  },
  {
    text: "Taps are leaking in the washroom",
    expectedCategory: "Plumbing",
    expectedSeverity: "Medium",
  },
  {
    text: "No internet in the computer lab",
    expectedCategory: "Networking",
    expectedSeverity: "High",
  },
  {
    text: "Washroom is dirty and has a foul smell",
    expectedCategory: "Sanitation",
    expectedSeverity: "Low",
  },
  {
    text: "Lift is stuck between floors",
    expectedCategory: "Other",
    expectedSeverity: "High",
  },
  {
    text: "Water leaking near the switchboard in the lab",
    expectedCategory: "Electrical",
    expectedSeverity: "Critical",
  },
  {
    text: "Exposed wire hanging from the ceiling in the corridor",
    expectedCategory: "Electrical",
    expectedSeverity: "Critical",
  },
  {
    text: "Loose wire behind the switchboard",
    expectedCategory: "Electrical",
    expectedSeverity: "Medium",
  },
  {
    text: "There are no sparks but the switch feels warm",
    expectedCategory: "Electrical",
    expectedSeverity: "High",
  },
  {
    text: "Tap is dripping slowly in the pantry",
    expectedCategory: "Plumbing",
    expectedSeverity: "Low",
  },
  {
    text: "Projector is not turning on in Lab 2",
    assetCategory: "Electrical",
    expectedCategory: "Electrical",
    expectedSeverity: "Medium",
  },
  {
    text: "Whiteboard marker tray is missing",
    expectedCategory: "Furniture",
    expectedSeverity: "Low",
  },
  {
    text: "Water is overflowing from the rooftop tank",
    expectedCategory: "Plumbing",
    expectedSeverity: "High",
  },
  {
    text: "Cockroaches and a foul smell in the canteen",
    expectedCategory: "Sanitation",
    expectedSeverity: "Medium",
  },
  {
    text: "Door hinge broken in the lab",
    expectedCategory: "Civil/Structural",
    expectedSeverity: "Medium",
  },
  {
    text: "CCTV camera not working in the corridor",
    expectedCategory: "Other",
    expectedSeverity: "Medium",
  },
  {
    text: "Cooling system works fine but the room is hot because the windows are open",
    expectedCategory: "Other",
    expectedSeverity: "Low",
  },
];

const isLlmMode = process.argv.includes("--llm");

if (!isLlmMode) {
  let categoryMatches = 0;
  let severityMatches = 0;
  let overallPasses = 0;
  let needsReviewCount = 0;

  const rows = TEST_CASES.map((testCase, index) => {
    const result = analyzeWithRules({
      title: testCase.text,
      description: "",
      assetCategory: testCase.assetCategory,
    });

    const catOk = result.category === testCase.expectedCategory;
    const sevOk = result.severity === testCase.expectedSeverity;
    const pass = catOk && sevOk;

    if (catOk) categoryMatches += 1;
    if (sevOk) severityMatches += 1;
    if (pass) overallPasses += 1;
    if (result.needsReview) needsReviewCount += 1;

    return {
      "#": index + 1,
      Text:
        testCase.text.length > 40
          ? `${testCase.text.slice(0, 37)}...`
          : testCase.text,
      "Exp Cat": testCase.expectedCategory,
      "Act Cat": result.category,
      "Exp Sev": testCase.expectedSeverity,
      "Act Sev": result.severity,
      Review: result.needsReview,
      Pass: pass ? "PASS" : "FAIL",
    };
  });

  console.table(rows);

  const total = TEST_CASES.length;
  const catAccuracy = ((categoryMatches / total) * 100).toFixed(1);
  const sevAccuracy = ((severityMatches / total) * 100).toFixed(1);

  console.log(`Category accuracy: ${categoryMatches}/${total} (${catAccuracy}%)`);
  console.log(`Severity accuracy: ${severityMatches}/${total} (${sevAccuracy}%)`);
  console.log(`Overall pass: ${overallPasses}/${total}`);
  console.log(`needsReview count: ${needsReviewCount}/${total}`);
} else {
  runLlmDemo();
}

async function runLlmDemo() {
  console.log("Running analysis demo with LLM comparison mode (--llm)...");
  console.log(`Model: ${process.env.LLM_MODEL || "(not set)"}`);
  console.log(`Timeout: ${process.env.LLM_TIMEOUT_MS || "8000"}ms`);
  console.log("Delay between requests: 1000ms\n");

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let rulesCatMatches = 0;
  let rulesSevMatches = 0;
  let rulesOverallPasses = 0;

  let llmCatMatches = 0;
  let llmSevMatches = 0;
  let llmOverallPasses = 0;

  let llmSourceCount = 0;
  let llmNeedsReviewCount = 0;

  const rows = [];

  for (let index = 0; index < TEST_CASES.length; index++) {
    const testCase = TEST_CASES[index];

    const rulesResult = analyzeWithRules({
      title: testCase.text,
      description: "",
      assetCategory: testCase.assetCategory,
    });

    const llmResult = await analyzeComplaint({
      title: testCase.text,
      description: "",
      assetCategory: testCase.assetCategory,
    });

    const rulesCatOk = rulesResult.category === testCase.expectedCategory;
    const rulesSevOk = rulesResult.severity === testCase.expectedSeverity;
    const rulesPass = rulesCatOk && rulesSevOk;

    if (rulesCatOk) rulesCatMatches += 1;
    if (rulesSevOk) rulesSevMatches += 1;
    if (rulesPass) rulesOverallPasses += 1;

    const llmCatOk = llmResult.category === testCase.expectedCategory;
    const llmSevOk = llmResult.severity === testCase.expectedSeverity;
    const llmPass = llmCatOk && llmSevOk;

    if (llmCatOk) llmCatMatches += 1;
    if (llmSevOk) llmSevMatches += 1;
    if (llmPass) llmOverallPasses += 1;
    if (llmResult.source === "llm") llmSourceCount += 1;
    if (llmResult.needsReview) llmNeedsReviewCount += 1;

    rows.push({
      "#": index + 1,
      Text:
        testCase.text.length > 35
          ? `${testCase.text.slice(0, 32)}...`
          : testCase.text,
      "Exp Cat": testCase.expectedCategory,
      "Rules Cat": rulesResult.category,
      "LLM Cat": llmResult.category,
      "Exp Sev": testCase.expectedSeverity,
      "Rules Sev": rulesResult.severity,
      "LLM Sev": llmResult.severity,
      "LLM Source": llmResult.source,
      "Cat Match": llmCatOk ? "YES" : "NO",
      "Sev Match": llmSevOk ? "YES" : "NO",
    });

    if (index < TEST_CASES.length - 1) {
      await sleep(1000);
    }
  }

  console.table(rows);

  const total = TEST_CASES.length;
  const rulesCatAcc = ((rulesCatMatches / total) * 100).toFixed(1);
  const rulesSevAcc = ((rulesSevMatches / total) * 100).toFixed(1);
  const llmCatAcc = ((llmCatMatches / total) * 100).toFixed(1);
  const llmSevAcc = ((llmSevMatches / total) * 100).toFixed(1);

  console.log("\n--- Comparison Summary ---");
  console.log(`Rules Category Accuracy: ${rulesCatMatches}/${total} (${rulesCatAcc}%)`);
  console.log(`LLM Category Accuracy:   ${llmCatMatches}/${total} (${llmCatAcc}%)`);
  console.log(`Rules Severity Accuracy: ${rulesSevMatches}/${total} (${rulesSevAcc}%)`);
  console.log(`LLM Severity Accuracy:   ${llmSevMatches}/${total} (${llmSevAcc}%)`);
  console.log(`Rules Overall Passes:    ${rulesOverallPasses}/${total}`);
  console.log(`LLM Overall Passes:      ${llmOverallPasses}/${total}`);
  console.log(`LLM Source Usage:        ${llmSourceCount}/${total}`);
  console.log(`LLM needsReview Count:   ${llmNeedsReviewCount}/${total}`);
}
