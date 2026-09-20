import React, { useContext } from "react";
import { AppContext } from "../App";
import { Clock, Zap, AlertTriangle, CheckCircle } from "lucide-react";

const MANUAL_GRADES = [
  {
    inspector: "Inspector A",
    grade: "B",
    defects: 3,
    points: 34,
    note: "Missed weft bar, borderline call",
  },
  {
    inspector: "Inspector B",
    grade: "REJECT",
    defects: 5,
    points: 48,
    note: "Counted crease as major defect",
  },
];

const AI_GRADE = {
  grade: "B" as const,
  defects: 4,
  pointsPer100: 28.4,
  note: "Deterministic — same result every run",
};

export function BeforeAfterPage() {
  const { navigate } = useContext(AppContext);

  return (
    <div style={{ minHeight: "100vh", background: "var(--forest)" }} className="woven-texture">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <p className="section-label" style={{ marginBottom: 12 }}>Comparison</p>
          <h1
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
              color: "var(--champagne)",
              margin: "0 0 16px",
              lineHeight: 1.1,
            }}
          >
            Before vs After
          </h1>
          <p style={{ color: "var(--champagne-dim)", maxWidth: 560, margin: "0 auto" }}>
            Two inspectors, one fabric, two different grades. Thaan.ai gives the same answer every time.
          </p>
        </div>

        {/* Time comparison bar */}
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            marginBottom: 40,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 20px",
              background: "var(--forest-2)",
              borderRadius: 999,
              border: "1px solid var(--forest-3)",
            }}
          >
            <Clock size={16} color="var(--champagne-dim)" />
            <span style={{ fontFamily: "'Spectral', serif", fontSize: 14, color: "var(--champagne-dim)" }}>
              Manual inspection: <strong style={{ color: "var(--warn)" }}>~4–6 min</strong> per sample
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 20px",
              background: "rgba(126, 217, 160, 0.1)",
              borderRadius: 999,
              border: "1px solid var(--pass)",
            }}
          >
            <Zap size={16} color="var(--pass)" />
            <span style={{ fontFamily: "'Spectral', serif", fontSize: 14, color: "var(--pass)" }}>
              Thaan.ai: <strong>~3–8 seconds</strong>
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          {/* MANUAL side */}
          <div>
            <div
              style={{
                padding: "12px 20px",
                background: "rgba(233, 185, 73, 0.1)",
                border: "1px solid var(--warn)",
                borderRadius: 12,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <AlertTriangle size={16} color="var(--warn)" />
              <span
                style={{
                  fontFamily: "'Unbounded', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--warn)",
                }}
              >
                Manual Inspection
              </span>
              <span
                style={{
                  fontFamily: "'Spectral', serif",
                  fontStyle: "italic",
                  fontSize: 12,
                  color: "var(--champagne-dim)",
                  marginLeft: "auto",
                }}
              >
                Illustrative sample
              </span>
            </div>

            {MANUAL_GRADES.map((g, i) => (
              <div
                key={i}
                className="card-dark"
                style={{ marginBottom: 16, borderLeft: "4px solid var(--warn)" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span
                    style={{
                      fontFamily: "'Unbounded', sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--champagne)",
                    }}
                  >
                    {g.inspector}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Unbounded', sans-serif",
                      fontWeight: 800,
                      fontSize: 20,
                      color: g.grade === "REJECT" ? "var(--reject)" : "var(--warn)",
                    }}
                  >
                    Grade {g.grade}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  {[
                    { label: "Defects noted", value: g.defects },
                    { label: "Points", value: g.points },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        background: "var(--forest)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        border: "1px solid var(--forest-3)",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Unbounded', sans-serif",
                          fontWeight: 800,
                          fontSize: 22,
                          color: "var(--champagne)",
                        }}
                      >
                        {value}
                      </div>
                      <div style={{ fontFamily: "'Spectral', serif", fontSize: 12, color: "var(--champagne-dim)", fontStyle: "italic" }}>
                        ({label})
                      </div>
                    </div>
                  ))}
                </div>

                <p
                  style={{
                    fontFamily: "'Spectral', serif",
                    fontStyle: "italic",
                    fontSize: 14,
                    color: "var(--champagne-dim)",
                    margin: 0,
                  }}
                >
                  "{g.note}"
                </p>
              </div>
            ))}

            <div
              style={{
                padding: "16px",
                background: "rgba(232, 97, 90, 0.08)",
                border: "1px solid rgba(232, 97, 90, 0.3)",
                borderRadius: 12,
                textAlign: "center",
              }}
            >
              <AlertTriangle size={20} color="var(--reject)" style={{ marginBottom: 8 }} />
              <p style={{ fontFamily: "'Spectral', serif", fontSize: 14, color: "var(--champagne-dim)", margin: 0 }}>
                Two inspectors → <strong style={{ color: "var(--reject)" }}>two different grades</strong>.<br />
                One dispute, average cost: ₹25,000–₹2,00,000.
              </p>
            </div>
          </div>

          {/* THAAN.AI side */}
          <div>
            <div
              style={{
                padding: "12px 20px",
                background: "rgba(126, 217, 160, 0.1)",
                border: "1px solid var(--pass)",
                borderRadius: 12,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <CheckCircle size={16} color="var(--pass)" />
              <span
                style={{
                  fontFamily: "'Unbounded', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--pass)",
                }}
              >
                Thaan.ai — Deterministic
              </span>
            </div>

            <div className="card-dark" style={{ marginBottom: 16, borderLeft: "4px solid var(--pass)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <span
                  style={{
                    fontFamily: "'Unbounded', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--champagne)",
                  }}
                >
                  AI + Code (every run)
                </span>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--pass)",
                    fontFamily: "'Unbounded', sans-serif",
                    fontWeight: 800,
                    fontSize: 28,
                    color: "var(--ink)",
                    boxShadow: "0 0 32px rgba(126,217,160,0.4)",
                  }}
                >
                  {AI_GRADE.grade}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {[
                  { label: "Defects found", value: AI_GRADE.defects },
                  { label: "Pts/100 sq yd", value: AI_GRADE.pointsPer100 },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      background: "var(--forest)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      border: "1px solid var(--forest-3)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Unbounded', sans-serif",
                        fontWeight: 800,
                        fontSize: 22,
                        color: "var(--champagne)",
                      }}
                    >
                      {value}
                    </div>
                    <div style={{ fontFamily: "'Spectral', serif", fontSize: 12, color: "var(--champagne-dim)", fontStyle: "italic" }}>
                      ({label})
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontFamily: "'Spectral', serif", fontStyle: "italic", fontSize: 14, color: "var(--pass)", margin: "0 0 16px" }}>
                "{AI_GRADE.note}"
              </p>

              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(126,217,160,0.08)",
                  borderRadius: 8,
                  border: "1px solid rgba(126,217,160,0.2)",
                }}
              >
                <p style={{ fontFamily: "'Spectral', serif", fontSize: 13, color: "var(--champagne-dim)", margin: 0 }}>
                  AI detects & classifies only. All scoring by fixed ASTM D5430 code —
                  <strong style={{ color: "var(--pass)" }}> same input, same grade, always</strong>.
                </p>
              </div>
            </div>

            {/* Run it yourself CTA */}
            <div
              style={{
                padding: "24px",
                background: "var(--forest-2)",
                border: "1px solid var(--forest-3)",
                borderRadius: 16,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "'Spectral', serif",
                  fontSize: 15,
                  color: "var(--champagne-dim)",
                  margin: "0 0 16px",
                }}
              >
                Try it yourself — upload a fabric photo and get a grade in seconds.
              </p>
              <button className="btn-primary" onClick={() => navigate("grade")}>
                <Zap size={16} />
                Grade a Sample
              </button>
            </div>
          </div>
        </div>

        {/* How AI-only detection + code-grading works */}
        <div className="card-dark" style={{ marginTop: 40 }}>
          <p className="section-label" style={{ marginBottom: 20 }}>Why both sides trust it</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                icon: "🔍",
                title: "AI detects",
                body: "Vision model finds and classifies defects. Confidence scores are shown. Any false detection can be deleted.",
              },
              {
                icon: "📐",
                title: "Code scores",
                body: "ASTM D5430 4-point rules are fixed code. No AI in the scoring step — identical input always gives identical points.",
              },
              {
                icon: "🔒",
                title: "Fingerprinted",
                body: "A SHA-256 hash of image + defects + threshold is printed on every certificate. Anyone can verify it.",
              },
              {
                icon: "📄",
                title: "Auditable",
                body: "The full defect table is on the certificate. Every number is traceable back to a bounding box on the image.",
              },
            ].map(({ icon, title, body }) => (
              <div
                key={title}
                style={{
                  background: "var(--forest)",
                  borderRadius: 14,
                  padding: "20px",
                  border: "1px solid var(--forest-3)",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                <h3
                  style={{
                    fontFamily: "'Unbounded', sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--champagne)",
                    margin: "0 0 8px",
                  }}
                >
                  {title}
                </h3>
                <p style={{ fontFamily: "'Spectral', serif", fontSize: 14, color: "var(--champagne-dim)", margin: 0, lineHeight: 1.5 }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
