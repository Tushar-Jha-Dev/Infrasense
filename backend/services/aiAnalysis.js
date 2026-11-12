import { CATEGORIES } from "../constants/categories.js";

const CATEGORY_PRIORITY = [
  "Electrical",
  "Plumbing",
  "HVAC",
  "Networking",
  "Civil/Structural",
  "Sanitation",
  "Furniture",
];

const CATEGORY_KEYWORDS = {
  Electrical: [
    "electric",
    "electrical",
    "wiring",
    "wire",
    "switch",
    "socket",
    "plug",
    "bulb",
    "tube light",
    "light",
    "lamp",
    "fan",
    "regulator",
    "power",
    "voltage",
    "circuit",
    "mcb",
    "fuse",
    "spark",
    "sparking",
    "short circuit",
    "projector",
    "extension board",
    "inverter",
    "ups",
    "switchboard",
    "distribution board",
    "electrical panel",
    "capacitor",
    "earthing",
    "tripping",
    "overheating",
    "power failure",
    "voltage fluctuation",
  ],
  Plumbing: [
    "leak",
    "leaking",
    "pipe",
    "tap",
    "faucet",
    "water supply",
    "no water",
    "drain",
    "drainage",
    "overflow",
    "overflowing",
    "flush",
    "cistern",
    "pump",
    "tank",
    "sink",
    "plumbing",
    "leakage",
    "burst",
    "blocked",
    "blockage",
    "water pressure",
    "water cooler",
    "water purifier",
    "geyser",
    "valve",
    "dripping",
  ],
  Furniture: [
    "chair",
    "table",
    "desk",
    "bench",
    "cupboard",
    "almirah",
    "shelf",
    "whiteboard",
    "blackboard",
    "furniture",
    "drawer",
    "cabinet",
    "stool",
    "armchair",
    "wobbly",
    "screw",
  ],
  HVAC: [
    "ac",
    "air conditioner",
    "air conditioning",
    "cooling",
    "heating",
    "ventilation",
    "exhaust",
    "cooler",
    "thermostat",
    "compressor",
    "chiller",
    "refrigerant",
    "air filter",
    "blower",
    "condenser",
    "duct",
    "airflow",
    "indoor unit",
    "outdoor unit",
  ],
  "Civil/Structural": [
    "wall",
    "crack",
    "ceiling",
    "roof",
    "plaster",
    "paint",
    "floor",
    "tile",
    "staircase",
    "stairs",
    "window",
    "door",
    "glass",
    "structural",
    "concrete",
    "seepage",
    "dampness",
    "corrosion",
    "rust",
    "pothole",
    "railing",
    "pavement",
    "waterproofing",
  ],
  Networking: [
    "wifi",
    "wi-fi",
    "internet",
    "network",
    "lan",
    "router",
    "ethernet",
    "bandwidth",
    "server",
    "access point",
    "broadband",
    "network switch",
    "connectivity",
    "lan port",
    "network port",
    "packet loss",
    "dns",
    "fiber",
  ],
  Sanitation: [
    "washroom",
    "toilet",
    "restroom",
    "urinal",
    "hygiene",
    "dustbin",
    "garbage",
    "cleaning",
    "dirty",
    "smell",
    "sewage",
    "sewer",
    "pest",
    "cockroach",
    "mosquito",
    "foul",
    "odour",
    "rodent",
    "rat",
    "termite",
    "waste",
    "sanitary",
  ],
};

const SEVERITY_RULES = [
  {
    level: "Critical",
    keywords: [
      "spark",
      "sparks",
      "sparking",
      "short circuit",
      "electric shock",
      "shock",
      "exposed wire",
      "live wire",
      "hanging wire",
      "fire",
      "smoke",
      "burning",
      "burnt",
      "gas leak",
      "gas smell",
      "flood",
      "flooding",
      "flooded",
      "collapse",
      "collapsed",
      "falling ceiling",
      "ceiling fell",
      "structural damage",
      "wire hanging",
    ],
  },
  {
    level: "High",
    keywords: [
      "no power",
      "power cut",
      "power outage",
      "blackout",
      "no water",
      "not working at all",
      "completely",
      "entire",
      "whole",
      "all rooms",
      "multiple",
      "unsafe",
      "danger",
      "dangerous",
      "overflowing",
      "large crack",
      "wide crack",
      "plaster falling",
      "no internet",
      "network down",
      "server down",
    ],
  },
  {
    level: "Medium",
    keywords: [
      "not working",
      "broken",
      "damaged",
      "leak",
      "leaking",
      "stopped",
      "failed",
      "fault",
      "faulty",
      "not cooling",
      "not turning on",
      "loose wire",
      "loose wiring",
      "loose connection",
      "loose cable",
    ],
  },
  {
    level: "Low",
    keywords: [
      "paint",
      "peeling",
      "scratch",
      "scratches",
      "stain",
      "dirty",
      "minor",
      "small",
      "cosmetic",
      "noisy",
      "noise",
      "loose",
      "dripping",
      "missing",
    ],
  },
];

const WATER_HAZARD_TERMS = [
  "leak",
  "leaking",
  "leakage",
  "leaked",
  "flood",
  "flooding",
  "flooded",
  "seepage",
  "seeping",
  "dripping",
];

const ELECTRICAL_HAZARD_TERMS = [
  "switchboard",
  "electrical panel",
  "distribution board",
  "socket",
  "wiring",
  "wire",
  "mcb",
  "transformer",
];

const NEGATION_WORDS = new Set([
  "no",
  "not",
  "without",
  "never",
  "nothing",
  "neither",
  "nor",
]);

const KEYWORD_CAUSES = [
  {
    keywords: ["flicker", "flickering"],
    cause: "Loose connection or failing light fitting",
  },
  {
    keywords: ["noise", "noisy"],
    cause: "Worn bearing or loose mounting",
  },
  {
    keywords: ["not cooling"],
    cause: "Low refrigerant or dirty filter",
  },
  {
    keywords: ["no water"],
    cause: "Supply interruption or failed tank pump",
  },
  {
    keywords: ["overflow", "overflowing"],
    cause: "Blocked outlet or drain",
  },
  {
    keywords: ["tripping"],
    cause: "Circuit overload or short circuit",
  },
  {
    keywords: ["water pressure"],
    cause: "Supply restriction or pump malfunction",
  },
  {
    keywords: ["slow internet"],
    cause: "Network congestion or bandwidth limitation",
  },
  {
    keywords: ["wobbling", "wobbly"],
    cause: "Loose mounting or worn joints",
  },
  {
    keywords: ["dampness", "seepage", "seeping"],
    cause: "Water seepage or failed waterproofing",
  },
  {
    keywords: ["blocked", "blockage"],
    cause: "Obstruction in the drainage line",
  },
];

const CATEGORY_DEFAULT_CAUSES = {
  Electrical: [
    "Loose or damaged wiring connection",
    "Overloaded circuit or tripped breaker",
    "Failed component such as a switch, capacitor or bulb",
  ],
  Plumbing: [
    "Worn washer, seal or joint",
    "Blocked or corroded pipe",
    "Faulty valve or pump",
  ],
  Furniture: [
    "Worn or loose joints and fittings",
    "Material damage from regular use",
    "Missing or broken hardware",
  ],
  HVAC: [
    "Dirty filter or blocked airflow",
    "Low refrigerant or compressor fault",
    "Faulty thermostat or fan motor",
  ],
  "Civil/Structural": [
    "Moisture seepage or water damage",
    "Age-related wear of the surface",
    "Settlement or structural stress (needs on-site inspection)",
  ],
  Networking: [
    "Faulty router, switch or access point",
    "Loose or damaged network cable",
    "Provider or configuration issue",
  ],
  Sanitation: [
    "Irregular cleaning schedule",
    "Blocked drain or sewer line",
    "Poor ventilation or waste handling",
  ],
  Other: ["Cause unclear from the description; on-site inspection needed"],
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Precompile whole-word/phrase boundary regexes with optional plural ending so "ac" never matches "place"
const compileTerm = (term, flags = "") =>
  new RegExp(`(?<![a-z0-9])${escapeRegex(term)}(?:s|es)?(?![a-z0-9])`, flags);

const CATEGORY_MATCHERS = Object.fromEntries(
  Object.entries(CATEGORY_KEYWORDS).map(([cat, terms]) => [
    cat,
    terms.map((term) => compileTerm(term)),
  ])
);

const SEVERITY_MATCHERS = SEVERITY_RULES.map(({ level, keywords }) => ({
  level,
  matchers: keywords.map((term) =>
    compileTerm(term, level === "Critical" ? "g" : "")
  ),
}));

const WATER_HAZARD_MATCHERS = WATER_HAZARD_TERMS.map((term) =>
  compileTerm(term)
);
const ELECTRICAL_HAZARD_MATCHERS = ELECTRICAL_HAZARD_TERMS.map((term) =>
  compileTerm(term)
);

const CAUSE_MATCHERS = KEYWORD_CAUSES.map(({ keywords, cause }) => ({
  cause,
  matchers: keywords.map((term) => compileTerm(term)),
}));

function hasAnyMatch(text, matchers) {
  return matchers.some((regex) => regex.test(text));
}

function getValidAssetCategory(assetCategory) {
  return typeof assetCategory === "string" &&
    CATEGORIES.includes(assetCategory)
    ? assetCategory
    : null;
}

function detectCategory(text, validAssetCategory) {
  const scores = {};
  for (const cat of CATEGORY_PRIORITY) {
    scores[cat] = CATEGORY_MATCHERS[cat].reduce(
      (count, regex) => (regex.test(text) ? count + 1 : count),
      0
    );
  }

  if (validAssetCategory && scores[validAssetCategory] !== undefined) {
    scores[validAssetCategory] += 1;
  }

  let bestCategory = null;
  let bestScore = 0;

  for (const cat of CATEGORY_PRIORITY) {
    if (scores[cat] > bestScore) {
      bestScore = scores[cat];
      bestCategory = cat;
    }
  }

  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  const allZero = sortedScores[0] === 0;
  const topTie = sortedScores[0] > 0 && sortedScores[0] === sortedScores[1];
  const category = bestScore === 0 ? validAssetCategory || "Other" : bestCategory;

  return { category, allZero, topTie };
}

function isNegatedMatch(text, matchIndex) {
  const beforeText = text.slice(0, matchIndex);
  const prevWords = beforeText.match(/[a-z0-9-]+/g)?.slice(-3) || [];
  return prevWords.some((word) => NEGATION_WORDS.has(word));
}

function evaluateCriticalMatches(text, matchers) {
  let totalMatches = 0;
  let unnegatedMatches = 0;

  for (const regex of matchers) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      totalMatches += 1;
      if (!isNegatedMatch(text, match.index)) {
        unnegatedMatches += 1;
      }
    }
  }

  return { totalMatches, unnegatedMatches };
}

function detectSeverity(text) {
  if (
    hasAnyMatch(text, WATER_HAZARD_MATCHERS) &&
    hasAnyMatch(text, ELECTRICAL_HAZARD_MATCHERS)
  ) {
    return { severity: "Critical", negatedCritical: false };
  }

  for (const rule of SEVERITY_MATCHERS) {
    if (rule.level === "Critical") {
      const { totalMatches, unnegatedMatches } = evaluateCriticalMatches(
        text,
        rule.matchers
      );
      if (unnegatedMatches > 0) {
        return { severity: "Critical", negatedCritical: false };
      }
      if (totalMatches > 0) {
        return { severity: "High", negatedCritical: true };
      }
      continue;
    }

    if (hasAnyMatch(text, rule.matchers)) {
      return { severity: rule.level, negatedCritical: false };
    }
  }

  return { severity: "Medium", negatedCritical: false };
}

function buildPossibleCauses(text, category) {
  const causes = [];

  for (const item of CAUSE_MATCHERS) {
    if (hasAnyMatch(text, item.matchers) && !causes.includes(item.cause)) {
      causes.push(item.cause);
    }
  }

  const defaults =
    CATEGORY_DEFAULT_CAUSES[category] || CATEGORY_DEFAULT_CAUSES.Other;

  for (const cause of defaults) {
    if (!causes.includes(cause)) {
      causes.push(cause);
    }
  }

  return causes.slice(0, 4);
}

// Deterministic rule-based classifier; kept separate so an LLM layer can call it as fallback
export function analyzeWithRules({ title, description, assetCategory } = {}) {
  const validAssetCategory = getValidAssetCategory(assetCategory);
  const safeTitle = typeof title === "string" ? title : "";
  const safeDescription = typeof description === "string" ? description : "";
  const text = `${safeTitle} ${safeDescription}`.toLowerCase().trim();

  if (!text) {
    const fallbackCategory = validAssetCategory || "Other";
    return {
      category: fallbackCategory,
      severity: "Medium",
      possibleCauses: buildPossibleCauses("", fallbackCategory),
      source: "rules",
      needsReview: true,
    };
  }

  const { category, allZero, topTie } = detectCategory(
    text,
    validAssetCategory
  );
  const { severity, negatedCritical } = detectSeverity(text);
  const possibleCauses = buildPossibleCauses(text, category);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const assetMismatch = Boolean(
    validAssetCategory && validAssetCategory !== category
  );
  const needsReview =
    allZero || topTie || assetMismatch || wordCount < 4 || negatedCritical;

  return {
    category,
    severity,
    possibleCauses,
    source: "rules",
    needsReview,
  };
}

export function analyzeComplaint(input = {}) {
  try {
    return analyzeWithRules(input && typeof input === "object" ? input : {});
  } catch (error) {
    console.error("Rule analysis fallback triggered:", error);
    const validAssetCategory = getValidAssetCategory(input?.assetCategory);
    return {
      category: validAssetCategory || "Other",
      severity: "Medium",
      possibleCauses: [...CATEGORY_DEFAULT_CAUSES.Other],
      source: "rules",
      needsReview: true,
    };
  }
}
