// ============================================================
// GRADING ENGINE — pure functions, zero AI, deterministic
// Supports:
// 1. ASTM D5430 (4-Point System)
// 2. 10-Point System
// 3. Custom Buyer Standard
// 4. Physical Size Calibration (True Inches via Ruler/Ref)
// 5. Immutable Reviewer Audit Trail
// ============================================================
import {
  FOUR_POINT_RULES,
  TEN_POINT_RULES,
  DEFAULT_CUSTOM_RULES,
  GRADING_THRESHOLDS,
  HOLE_RULES,
  DEFECT_TYPE_LABELS,
  type GradingStandard,
  type CustomStandardRules,
} from "../config/grading";

export type DefectType =
  | "hole"
  | "stain"
  | "slub"
  | "thick_yarn"
  | "thin_place"
  | "broken_end"
  | "float"
  | "weft_bar"
  | "crease"
  | "other";

export type Severity = "major" | "minor";

export interface BBox {
  /** 0–1 fraction of image width */
  x: number;
  /** 0–1 fraction of image height */
  y: number;
  /** 0–1 fraction of image width */
  w: number;
  /** 0–1 fraction of image height */
  h: number;
}

export interface Defect {
  id: string;
  type: DefectType;
  severity: Severity;
  bbox: BBox;
  confidence: number;
  note?: string;
}

export interface CalibrationData {
  p1: { x: number; y: number }; // 0-1 fraction
  p2: { x: number; y: number };
  realLengthIn: number;
  pixelsPerInch: number;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  defectId: string;
  action: "deleted" | "modified_type" | "modified_severity" | "calibrated_scale";
  details: string;
}

export interface GradingInput {
  defects: Defect[];
  fabricWidthIn: number;
  imageLengthIn?: number;
  imageWidth: number;
  imageHeight: number;
  agreedThreshold?: number;
  standard?: GradingStandard;
  customRules?: CustomStandardRules;
  calibration?: CalibrationData | null;
  auditTrail?: AuditEvent[];
}

export interface ScoredDefect extends Defect {
  /** Physical size in true inches */
  sizeIn: number;
  /** Penalty points under selected standard */
  points: number;
}

export interface GradingResult {
  scoredDefects: ScoredDefect[];
  totalPoints: number;
  totalAreaSqYd: number;
  pointsPer100SqYd: number;
  grade: "A" | "B" | "REJECT";
  gradeReason: string;
  agreedThreshold: number;
  widthIn: number;
  lengthIn: number;
  standard: GradingStandard;
  calibration?: CalibrationData | null;
  auditTrail: AuditEvent[];
}

// ----------------------------------------------------------------
// Core calculation helpers
// ----------------------------------------------------------------

/**
 * Calculates physical defect size in true inches.
 * If calibration is present, computes size using calibrated pixels-per-inch.
 * Otherwise falls back to the proportional fabric width ratio.
 */
export function computeDefectSizeIn(
  defect: Defect,
  fabricWidthIn: number,
  imageLengthIn: number,
  imageWidth: number = 1000,
  imageHeight: number = 1000,
  calibration?: CalibrationData | null
): number {
  if (calibration && calibration.pixelsPerInch > 0) {
    const pixelW = defect.bbox.w * imageWidth;
    const pixelH = defect.bbox.h * imageHeight;
    const maxPixels = Math.max(pixelW, pixelH);
    return maxPixels / calibration.pixelsPerInch;
  }

  const wIn = defect.bbox.w * fabricWidthIn;
  const hIn = defect.bbox.h * imageLengthIn;
  return Math.max(wIn, hIn);
}

/** Compute penalty points based on the active standard */
export function computePoints(
  defect: Defect,
  sizeIn: number,
  standard: GradingStandard = "four_point",
  customRules: CustomStandardRules = DEFAULT_CUSTOM_RULES
): number {
  if (defect.severity === "minor") return 0;

  if (standard === "ten_point") {
    if (defect.type === "hole") {
      return sizeIn <= 1 ? 3 : 5;
    }
    if (sizeIn <= TEN_POINT_RULES.TIER_1_MAX) return TEN_POINT_RULES.TIER_1_PTS;
    if (sizeIn <= TEN_POINT_RULES.TIER_2_MAX) return TEN_POINT_RULES.TIER_2_PTS;
    if (sizeIn <= TEN_POINT_RULES.TIER_3_MAX) return TEN_POINT_RULES.TIER_3_PTS;
    return TEN_POINT_RULES.TIER_4_PTS;
  }

  if (standard === "custom") {
    if (defect.type === "hole") {
      return sizeIn <= customRules.holeSmallMaxIn
        ? customRules.holeSmallPts
        : customRules.holeLargePts;
    }
    if (sizeIn <= customRules.tier1MaxIn) return customRules.tier1Pts;
    if (sizeIn <= customRules.tier2MaxIn) return customRules.tier2Pts;
    if (sizeIn <= customRules.tier3MaxIn) return customRules.tier3Pts;
    return customRules.tier4Pts;
  }

  // Default: ASTM D5430 (4-Point System)
  if (defect.type === "hole") {
    if (sizeIn <= HOLE_RULES.SMALL_HOLE_MAX) return HOLE_RULES.SMALL_HOLE_POINTS;
    return HOLE_RULES.LARGE_HOLE_POINTS;
  }

  if (sizeIn <= FOUR_POINT_RULES.TIER_1_MAX) return 1;
  if (sizeIn <= FOUR_POINT_RULES.TIER_2_MAX) return 2;
  if (sizeIn <= FOUR_POINT_RULES.TIER_3_MAX) return 3;
  return FOUR_POINT_RULES.MAX_POINTS_PER_DEFECT;
}

// ----------------------------------------------------------------
// Main grading function
// ----------------------------------------------------------------
export function gradeDefects(input: GradingInput): GradingResult {
  const {
    defects,
    fabricWidthIn,
    imageWidth,
    imageHeight,
    standard = "four_point",
    customRules = DEFAULT_CUSTOM_RULES,
    calibration = null,
    auditTrail = [],
  } = input;

  const defaultThreshold =
    standard === "ten_point"
      ? TEN_POINT_RULES.B_MAX
      : standard === "custom"
      ? customRules.gradeBMax
      : GRADING_THRESHOLDS.B_MAX;

  const agreedThreshold = input.agreedThreshold ?? defaultThreshold;

  const imageLengthIn =
    input.imageLengthIn ?? fabricWidthIn * (imageHeight / imageWidth);

  // Score each defect
  const scoredDefects: ScoredDefect[] = defects.map((d) => {
    const sizeIn = computeDefectSizeIn(
      d,
      fabricWidthIn,
      imageLengthIn,
      imageWidth,
      imageHeight,
      calibration
    );
    const points = computePoints(d, sizeIn, standard, customRules);
    return { ...d, sizeIn, points };
  });

  const totalPoints = scoredDefects.reduce((sum, d) => sum + d.points, 0);

  // Area in sq yards (1 sq yd = 1296 sq in)
  const areaSqIn = fabricWidthIn * imageLengthIn;
  const totalAreaSqYd = areaSqIn / 1296;

  // Normalized points calculation
  const pointsPer100SqYd =
    totalAreaSqYd > 0 ? (totalPoints * 100) / totalAreaSqYd : 0;

  // Determine Grade
  let grade: "A" | "B" | "REJECT";
  let gradeReason: string;

  const aLimit =
    standard === "ten_point"
      ? TEN_POINT_RULES.A_MAX
      : standard === "custom"
      ? customRules.gradeAMax
      : GRADING_THRESHOLDS.A_MAX;

  if (pointsPer100SqYd <= aLimit) {
    grade = "A";
    gradeReason = `${pointsPer100SqYd.toFixed(1)} pts — within Grade A standard (≤ ${aLimit})`;
  } else if (pointsPer100SqYd <= agreedThreshold) {
    grade = "B";
    gradeReason = `${pointsPer100SqYd.toFixed(1)} pts — within agreed Grade B threshold (≤ ${agreedThreshold})`;
  } else {
    grade = "REJECT";
    const contributingDefects = scoredDefects
      .filter((defect) => defect.points > 0)
      .sort((a, b) => b.points - a.points || b.sizeIn - a.sizeIn)
      .slice(0, 3)
      .map((defect) => `${DEFECT_TYPE_LABELS[defect.type] || defect.type} ${defect.sizeIn.toFixed(1)} in (${defect.points} pt)`)
      .join(", ");
    gradeReason = contributingDefects
      ? `${pointsPer100SqYd.toFixed(1)} pts/100 sq yd exceeds the agreed limit of ${agreedThreshold}. Basis: ${contributingDefects}.`
      : `${pointsPer100SqYd.toFixed(1)} pts/100 sq yd exceeds the agreed limit of ${agreedThreshold}.`;
  }

  return {
    scoredDefects,
    totalPoints,
    totalAreaSqYd,
    pointsPer100SqYd,
    grade,
    gradeReason,
    agreedThreshold,
    widthIn: fabricWidthIn,
    lengthIn: imageLengthIn,
    standard,
    calibration,
    auditTrail,
  };
}

// ----------------------------------------------------------------
// Multi-image roll aggregation
// ----------------------------------------------------------------
export interface RollGradingInput {
  sections: GradingInput[];
  agreedThreshold?: number;
  standard?: GradingStandard;
}

export interface RollGradingResult {
  sectionResults: GradingResult[];
  totalPoints: number;
  totalAreaSqYd: number;
  pointsPer100SqYd: number;
  grade: "A" | "B" | "REJECT";
  gradeReason: string;
  agreedThreshold: number;
  standard: GradingStandard;
}

export function gradeRoll(input: RollGradingInput): RollGradingResult {
  const standard = input.standard ?? "four_point";
  const agreedThreshold =
    input.agreedThreshold ??
    (standard === "ten_point" ? TEN_POINT_RULES.B_MAX : GRADING_THRESHOLDS.B_MAX);

  const sectionResults = input.sections.map((s) =>
    gradeDefects({ ...s, agreedThreshold, standard })
  );

  const totalPoints = sectionResults.reduce((s, r) => s + r.totalPoints, 0);
  const totalAreaSqYd = sectionResults.reduce(
    (s, r) => s + r.totalAreaSqYd,
    0
  );
  const pointsPer100SqYd =
    totalAreaSqYd > 0 ? (totalPoints * 100) / totalAreaSqYd : 0;

  const aLimit =
    standard === "ten_point" ? TEN_POINT_RULES.A_MAX : GRADING_THRESHOLDS.A_MAX;

  let grade: "A" | "B" | "REJECT";
  let gradeReason: string;

  if (pointsPer100SqYd <= aLimit) {
    grade = "A";
    gradeReason = `${pointsPer100SqYd.toFixed(1)} pts — Grade A (≤ ${aLimit})`;
  } else if (pointsPer100SqYd <= agreedThreshold) {
    grade = "B";
    gradeReason = `${pointsPer100SqYd.toFixed(1)} pts — within agreed threshold (≤ ${agreedThreshold})`;
  } else {
    grade = "REJECT";
    gradeReason = `${pointsPer100SqYd.toFixed(1)} pts — exceeds agreed threshold (${agreedThreshold})`;
  }

  return {
    sectionResults,
    totalPoints,
    totalAreaSqYd,
    pointsPer100SqYd,
    grade,
    gradeReason,
    agreedThreshold,
    standard,
  };
}
