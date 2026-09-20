// ============================================================
// GRADING CONFIGURATION — all constants in one place
// Change thresholds, prices, or scoring rules here.
// ============================================================

export type GradingStandard = "four_point" | "ten_point" | "custom";

export interface CustomStandardRules {
  tier1MaxIn: number;
  tier1Pts: number;
  tier2MaxIn: number;
  tier2Pts: number;
  tier3MaxIn: number;
  tier3Pts: number;
  tier4Pts: number;
  holeSmallMaxIn: number;
  holeSmallPts: number;
  holeLargePts: number;
  gradeAMax: number;
  gradeBMax: number;
}

export const GRADING_STANDARDS_INFO: Record<
  GradingStandard,
  { name: string; description: string; unit: string }
> = {
  four_point: {
    name: "4-Point System (ASTM D5430)",
    description: "Global export standard for Zara, H&M, Walmart, Target.",
    unit: "pts / 100 sq yd",
  },
  ten_point: {
    name: "10-Point System",
    description: "Traditional woolen and worsted standard. Max 10 points/linear yard.",
    unit: "pts / 100 lin yd",
  },
  custom: {
    name: "Custom Buyer Standard",
    description: "Configurable point tiers & tolerances negotiated with buyer.",
    unit: "pts / 100 sq yd",
  },
};

export const GRADING_THRESHOLDS = {
  /** Points per 100 sq yd — inclusive upper bound for Grade A (4-point) */
  A_MAX: 20,
  /** Points per 100 sq yd — inclusive upper bound for Grade B (4-point) */
  B_MAX: 40,
};

export const FOUR_POINT_RULES = {
  /** Size in inches ≤ this → 1 point */
  TIER_1_MAX: 3,
  /** Size in inches ≤ this → 2 points */
  TIER_2_MAX: 6,
  /** Size in inches ≤ this → 3 points */
  TIER_3_MAX: 9,
  /** Size in inches > TIER_3_MAX → 4 points (maximum per defect) */
  MAX_POINTS_PER_DEFECT: 4,
};

export const TEN_POINT_RULES = {
  /** Size in inches ≤ 1 → 1 point */
  TIER_1_MAX: 1,
  TIER_1_PTS: 1,
  /** Size > 1 to 5 inches → 3 points */
  TIER_2_MAX: 5,
  TIER_2_PTS: 3,
  /** Size > 5 to 10 inches → 5 points */
  TIER_3_MAX: 10,
  TIER_3_PTS: 5,
  /** Size > 10 to 36 inches → 10 points */
  TIER_4_MAX: 36,
  TIER_4_PTS: 10,
  MAX_POINTS_PER_DEFECT: 10,
  /** Grade A: ≤ 50 pts/100 yd, Grade B: ≤ 75 pts/100 yd */
  A_MAX: 50,
  B_MAX: 75,
};

export const DEFAULT_CUSTOM_RULES: CustomStandardRules = {
  tier1MaxIn: 2,
  tier1Pts: 1,
  tier2MaxIn: 5,
  tier2Pts: 2,
  tier3MaxIn: 8,
  tier3Pts: 3,
  tier4Pts: 5,
  holeSmallMaxIn: 0.75,
  holeSmallPts: 3,
  holeLargePts: 6,
  gradeAMax: 15,
  gradeBMax: 30,
};

export const HOLE_RULES = {
  /** Holes ≤ this inch → 2 points */
  SMALL_HOLE_MAX: 1,
  /** Holes > SMALL_HOLE_MAX → 4 points */
  SMALL_HOLE_POINTS: 2,
  LARGE_HOLE_POINTS: 4,
};

/** Calibration Reference Presets for true inch defect measurement */
export const CALIBRATION_PRESETS = [
  { label: "Standard Ruler (6 inches)", lengthIn: 6 },
  { label: "A4 Sheet Width (8.27 inches)", lengthIn: 8.27 },
  { label: "Credit / ID Card Length (3.37 inches)", lengthIn: 3.37 },
  { label: "Sewing Measure (10 inches)", lengthIn: 10 },
  { label: "Custom Real-world Length", lengthIn: 0 },
];

/** Default fabric width in inches (standard shirting/suiting export width) */
export const DEFAULT_FABRIC_WIDTH_IN = 58;

/** Default agreed threshold for the demo (points per 100 sq yd) */
export const DEFAULT_AGREED_THRESHOLD = 40;

// ============================================================
// PRICING PLANS (INR) — edit here to update the landing page
// ============================================================
export const PRICING_PLANS = [
  {
    name: "Mill Starter",
    priceMonthly: 4999,
    priceAnnual: 3999,
    description: "For small mills and inspection teams",
    features: [
      "100 AI-assisted gradings / month",
      "₹50,000 included AI usage credit",
      "PDF certificates & QR codes",
      "4-Point ASTM D5430",
      "7-day history",
      "Email support",
    ],
    highlight: false,
    cta: "Start free trial",
  },
  {
    name: "Trader Pro",
    priceMonthly: 14999,
    priceAnnual: 11999,
    description: "For active exporters and fabric traders",
    features: [
      "1,000 AI-assisted gradings / month",
      "₹1,50,000 included AI usage credit",
      "Multiple Standards (4-Pt, 10-Pt, Custom)",
      "Size Calibration & Audit Trail",
      "Interactive Buyer Accept / Dispute Links",
      "Priority support",
    ],
    highlight: true,
    cta: "Start free trial",
  },
  {
    name: "Mill Enterprise",
    priceMonthly: 0,
    priceAnnual: 0,
    description: "For large mills and buying houses",
    features: [
      "Unlimited gradings",
      "Custom brand compliance matrix",
      "Buyer portal with digital sign-off",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    highlight: false,
    cta: "Contact sales",
  },
];

// ============================================================
// DEFECT TYPE LABELS
// ============================================================
export const DEFECT_TYPE_LABELS: Record<string, string> = {
  hole: "Hole / Opening",
  stain: "Stain",
  slub: "Slub",
  thick_yarn: "Thick Yarn",
  thin_place: "Thin Place",
  broken_end: "Broken End",
  float: "Float",
  weft_bar: "Weft Bar",
  crease: "Crease",
  other: "Other",
};

export const DEFECT_TYPES = Object.keys(DEFECT_TYPE_LABELS);

// ============================================================
// SAMPLE IMAGES (bundled for demo / offline mode)
// ============================================================
export const SAMPLE_IMAGES = [
  {
    id: "sample-1",
    label: "Woven — Stain & Float",
    path: "/samples/sample1.jpg",
    description: "Grey woven fabric with oil stain and float defect",
  },
  {
    id: "sample-2",
    label: "Denim — Slub & Broken End",
    path: "/samples/sample2.jpg",
    description: "Indigo denim with slub cluster and broken warp end",
  },
  {
    id: "sample-3",
    label: "Shirting — Weft Bar",
    path: "/samples/sample3.jpg",
    description: "White shirting fabric with prominent weft bar",
  },
  {
    id: "sample-4",
    label: "Knit — Hole & Crease",
    path: "/samples/sample4.jpg",
    description: "Grey jersey knit with run hole and crease marks",
  },
];
