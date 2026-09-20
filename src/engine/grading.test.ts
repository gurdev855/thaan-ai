// ============================================================
// GRADING ENGINE UNIT TESTS
// Run: npx vitest run
// ============================================================
import { describe, it, expect } from "vitest";
import {
  gradeDefects,
  computeDefectSizeIn,
  computePoints,
  gradeRoll,
  type Defect,
  type GradingInput,
  type CalibrationData,
  type AuditEvent,
} from "./grading";
import { GRADING_THRESHOLDS, DEFAULT_CUSTOM_RULES } from "../config/grading";

function makeDefect(
  type: Defect["type"],
  severity: Defect["severity"],
  w: number,
  h: number,
  id = "test"
): Defect {
  return {
    id,
    type,
    severity,
    bbox: { x: 0, y: 0, w, h },
    confidence: 1,
    note: "",
  };
}

const BASE_INPUT: Omit<GradingInput, "defects"> = {
  fabricWidthIn: 58,
  imageWidth: 1160,
  imageHeight: 1160,
  agreedThreshold: 40,
};

describe("computeDefectSizeIn", () => {
  it("uses width dimension when wider than tall", () => {
    const d = makeDefect("stain", "major", 0.2, 0.05);
    expect(computeDefectSizeIn(d, 58, 58)).toBeCloseTo(11.6);
  });

  it("uses height dimension when taller than wide", () => {
    const d = makeDefect("float", "major", 0.02, 0.15);
    expect(computeDefectSizeIn(d, 58, 58)).toBeCloseTo(8.7);
  });

  it("TC-Calib: accurately measures true physical inches when calibration scale is provided", () => {
    // Defect width = 0.2 of 1000px = 200px
    const d = makeDefect("stain", "major", 0.2, 0.05);
    const calib: CalibrationData = {
      p1: { x: 0, y: 0 },
      p2: { x: 0.5, y: 0 },
      realLengthIn: 10,
      pixelsPerInch: 50, // 50 pixels per inch
    };
    // 200px / (50 px/in) = exactly 4.0 inches
    const sizeIn = computeDefectSizeIn(d, 58, 58, 1000, 1000, calib);
    expect(sizeIn).toBeCloseTo(4.0);
  });
});

describe("computePoints — 4-point table (ASTM D5430)", () => {
  it("TC-1: size exactly 3 in → 1 point (boundary inclusive)", () => {
    const d = makeDefect("stain", "major", 3 / 58, 0);
    expect(computePoints(d, 3)).toBe(1);
  });

  it("TC-2: size 3.01 in → 2 points (just over boundary)", () => {
    const d = makeDefect("slub", "major", 0, 0);
    expect(computePoints(d, 3.01)).toBe(2);
  });

  it("TC-3: size exactly 6 in → 2 points (boundary inclusive)", () => {
    const d = makeDefect("float", "major", 0, 0);
    expect(computePoints(d, 6)).toBe(2);
  });

  it("TC-4: size 6.01 in → 3 points", () => {
    const d = makeDefect("broken_end", "major", 0, 0);
    expect(computePoints(d, 6.01)).toBe(3);
  });

  it("TC-5: size exactly 9 in → 3 points (boundary inclusive)", () => {
    const d = makeDefect("weft_bar", "major", 0, 0);
    expect(computePoints(d, 9)).toBe(3);
  });

  it("TC-6: size 9.01 in → 4 points", () => {
    const d = makeDefect("crease", "major", 0, 0);
    expect(computePoints(d, 9.01)).toBe(4);
  });

  it("TC-7: minor defect always = 0 points regardless of size", () => {
    const d = makeDefect("stain", "minor", 0, 0);
    expect(computePoints(d, 50)).toBe(0);
  });

  it("TC-8: hole ≤ 1 in → 2 points", () => {
    const d = makeDefect("hole", "major", 0, 0);
    expect(computePoints(d, 1)).toBe(2);
  });

  it("TC-9: hole > 1 in → 4 points", () => {
    const d = makeDefect("hole", "major", 0, 0);
    expect(computePoints(d, 1.5)).toBe(4);
  });
});

describe("computePoints — 10-Point System", () => {
  it("TC-10pt-1: size ≤ 1 in → 1 point", () => {
    const d = makeDefect("stain", "major", 0, 0);
    expect(computePoints(d, 0.8, "ten_point")).toBe(1);
  });

  it("TC-10pt-2: size > 1 to 5 in → 3 points", () => {
    const d = makeDefect("stain", "major", 0, 0);
    expect(computePoints(d, 3.5, "ten_point")).toBe(3);
  });

  it("TC-10pt-3: size > 5 to 10 in → 5 points", () => {
    const d = makeDefect("float", "major", 0, 0);
    expect(computePoints(d, 7.0, "ten_point")).toBe(5);
  });

  it("TC-10pt-4: size > 10 in → 10 points", () => {
    const d = makeDefect("weft_bar", "major", 0, 0);
    expect(computePoints(d, 14.0, "ten_point")).toBe(10);
  });
});

describe("computePoints — Custom Buyer Standard", () => {
  it("TC-Custom: applies user-defined tiers and penalty points", () => {
    const customRules = {
      ...DEFAULT_CUSTOM_RULES,
      tier1MaxIn: 2,
      tier1Pts: 2, // custom 2 points under 2 inches
      tier2MaxIn: 4,
      tier2Pts: 5, // custom 5 points under 4 inches
    };
    const d = makeDefect("slub", "major", 0, 0);
    expect(computePoints(d, 1.5, "custom", customRules)).toBe(2);
    expect(computePoints(d, 3.5, "custom", customRules)).toBe(5);
  });
});

describe("gradeDefects — points and audit trail", () => {
  it("TC-10: no defects → 0 points, Grade A", () => {
    const result = gradeDefects({ ...BASE_INPUT, defects: [] });
    expect(result.totalPoints).toBe(0);
    expect(result.pointsPer100SqYd).toBe(0);
    expect(result.grade).toBe("A");
  });

  it("TC-11: one major stain 3 in wide on 58×58 in fabric → correct pts/100sqyd", () => {
    const defect = makeDefect("stain", "major", 3 / 58, 0);
    const result = gradeDefects({ ...BASE_INPUT, defects: [defect] });
    expect(result.totalPoints).toBe(1);
    expect(result.pointsPer100SqYd).toBeCloseTo((1 * 100) / (58 * 58 / 1296), 1);
    expect(result.grade).toBe("B");
  });

  it("TC-Audit: retains reviewer audit trail in the result", () => {
    const audit: AuditEvent = {
      id: "a1",
      timestamp: 1726771800000,
      defectId: "d1",
      action: "deleted",
      details: "Deleted false positive stain",
    };
    const result = gradeDefects({
      ...BASE_INPUT,
      defects: [],
      auditTrail: [audit],
    });
    expect(result.auditTrail.length).toBe(1);
    expect(result.auditTrail[0].action).toBe("deleted");
  });

  it("explains the basis when a result is rejected", () => {
    const defect = makeDefect("hole", "major", 0.2, 0.2, "rejecting-hole");
    const result = gradeDefects({ ...BASE_INPUT, defects: [defect] });

    expect(result.grade).toBe("REJECT");
    expect(result.gradeReason).toContain("exceeds the agreed limit of 40");
    expect(result.gradeReason).toContain("Hole / Opening");
    expect(result.gradeReason).toContain("4 pt");
  });
});

describe("gradeRoll — multi-image aggregation", () => {
  it("TC-15: aggregates two sections correctly", () => {
    const d1 = makeDefect("stain", "major", 3 / 58, 0, "d1");
    const d2 = makeDefect("stain", "major", 3 / 58, 0, "d2");
    const result = gradeRoll({
      sections: [
        { ...BASE_INPUT, defects: [d1] },
        { ...BASE_INPUT, defects: [d2] },
      ],
      agreedThreshold: 40,
    });
    expect(result.totalPoints).toBe(2);
    expect(result.totalAreaSqYd).toBeCloseTo(2 * (58 * 58) / 1296, 1);
  });
});
