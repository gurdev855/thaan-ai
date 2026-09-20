import React from "react";

interface GradeBadgeProps {
  grade: "A" | "B" | "REJECT";
  size?: "sm" | "md" | "lg" | "xl";
  reason?: string;
}

const SIZE_MAP = {
  sm:  { outer: 56, font: 22, pill: false },
  md:  { outer: 80, font: 32, pill: false },
  lg:  { outer: 120, font: 48, pill: false },
  xl:  { outer: 160, font: 64, pill: true  },
};

const GRADE_CONFIG = {
  A:      { bg: "var(--pass)",   text: "var(--ink)",   label: "A" },
  B:      { bg: "var(--warn)",   text: "var(--ink)",   label: "B" },
  REJECT: { bg: "var(--reject)", text: "var(--ink)",   label: "✗" },
};

export function GradeBadge({ grade, size = "md", reason }: GradeBadgeProps) {
  const cfg = GRADE_CONFIG[grade];
  const sz  = SIZE_MAP[size];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div
        className={`grade-badge grade-${grade.toLowerCase()}`}
        style={{
          width:  sz.outer,
          height: sz.outer,
          fontSize: sz.font,
          boxShadow: `0 0 40px ${cfg.bg}44`,
          flexShrink: 0,
        }}
      >
        {grade === "REJECT" ? (
          <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 800, color: cfg.text }}>!</span>
        ) : (
          <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 800, color: cfg.text }}>{grade}</span>
        )}
      </div>

      {grade === "REJECT" && size !== "sm" && (
        <div
          style={{
            fontFamily: "'Unbounded', sans-serif",
            fontWeight: 800,
            fontSize: size === "xl" ? 22 : 14,
            color: "var(--reject)",
            letterSpacing: "0.04em",
          }}
        >
          REJECT
        </div>
      )}

      {reason && (
        <p
          style={{
            fontFamily: "'Spectral', serif",
            fontSize: 14,
            color: cfg.bg,
            textAlign: "center",
            margin: 0,
            maxWidth: 280,
            lineHeight: 1.5,
          }}
        >
          {reason}
        </p>
      )}
    </div>
  );
}
