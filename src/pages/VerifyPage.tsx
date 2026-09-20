import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../App";
import {
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Check,
  AlertTriangle,
  History,
  FileCheck,
  UserCheck,
} from "lucide-react";
import { loadSharedReport, verifyReport } from "../api/trust";
import { updateBuyerSignOff, type BuyerSignOff } from "../utils/history";
import { GradeBadge } from "../components/GradeBadge";
import { GRADING_STANDARDS_INFO, type GradingStandard } from "../config/grading";

export function VerifyPage() {
  const { navigate, currentReport } = useContext(AppContext);
  const [reportJSON, setReportJSON] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<"match" | "mismatch" | null>(null);
  const [checking, setChecking] = useState(false);
  const [parsedReport, setParsedReport] = useState<any>(null);
  const [error, setError] = useState("");

  // Buyer Sign-off portal states (from shareable link)
  const [urlReport, setUrlReport] = useState<any>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerNotes, setBuyerNotes] = useState("");
  const [signOffStatus, setSignOffStatus] = useState<"none" | "accepted" | "disputed">("none");

  // Check URL query parameters or hash on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let certParam = params.get("cert");

    if (!certParam && window.location.hash.includes("cert=")) {
      const match = window.location.hash.match(/cert=([^&]+)/);
      if (match) certParam = match[1];
    }

    if (certParam) {
      loadSharedReport(certParam)
        .then((shared) => {
          const report = { ...shared.payload, fingerprint: shared.fingerprint, shareId: shared.shareId, signingPayload: shared.payload };
          setUrlReport(report);
          setParsedReport(report);
          setReportJSON(JSON.stringify(report, null, 2));
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load shared certificate."));
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setReportJSON(content);
    };
    reader.readAsText(file);
  };

  const loadFromCurrentSession = () => {
    if (!currentReport) return;
    setParsedReport(currentReport);
    setReportJSON(JSON.stringify(currentReport, null, 2));
    setImageDataUrl(currentReport.imageDataUrl);
    setError("");
    setResult(null);
  };

  const verify = async () => {
    setChecking(true);
    setResult(null);
    setError("");

    try {
      const report = JSON.parse(reportJSON);
      setParsedReport(report);

      if (!report.signingPayload || !report.fingerprint) {
        setError("This certificate does not contain a server signature and cannot be verified as authentic.");
        return;
      }
      setResult((await verifyReport(report.signingPayload, report.fingerprint)) ? "match" : "mismatch");
    } catch (err: unknown) {
      setError(err instanceof Error ? `Parse error: ${err.message}` : "Invalid report JSON.");
    } finally {
      setChecking(false);
    }
  };

  const handleBuyerSignOff = (status: "accepted" | "disputed") => {
    if (!buyerName.trim()) {
      setError("Please enter your Company / Buyer Name before signing off.");
      return;
    }
    const rollId = urlReport?.rollId || parsedReport?.rollId;
    if (!rollId) return;

    const signOff: BuyerSignOff = {
      status,
      timestamp: Date.now(),
      buyerName: buyerName.trim(),
      notes: buyerNotes.trim(),
    };

    updateBuyerSignOff(rollId, signOff);
    setSignOffStatus(status);
    setError("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--champagne)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
        <p className="section-label-light" style={{ marginBottom: 12 }}>
          {urlReport ? "Buyer Portal & Sign-Off" : "Verify Screen"}
        </p>

        <h1
          style={{
            fontFamily: "'Unbounded', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(1.5rem, 4vw, 2.3rem)",
            color: "var(--ink)",
            margin: "8px 0 12px",
            lineHeight: 1.1,
          }}
        >
          {urlReport ? "Buyer Sign-Off & Verification" : "Report & Server Verification"}
        </h1>

        <p style={{ color: "var(--ink-dim)", maxWidth: 580, marginBottom: 32, fontFamily: "'Spectral', serif" }}>
          {urlReport
            ? "You are viewing a certificate issued by thaan.ai. Ask the issuing server to verify its signed payload, then accept or dispute the grade."
            : "Paste the certificate JSON and ask the issuing server to verify that its signed report payload has not changed."}
        </p>

        {/* 1-Click Current Session Auto-fill if available */}
        {!urlReport && currentReport && (
          <div
            style={{
              padding: "14px 18px",
              background: "rgba(15, 118, 110, 0.08)",
              borderRadius: 12,
              border: "1px solid #C9BDA8",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FileCheck size={18} color="var(--forest)" />
              <span style={{ fontFamily: "'Spectral', serif", fontSize: 14 }}>
                Graded roll available from current session: <strong>{currentReport.rollId}</strong> (Grade {currentReport.grading.grade})
              </span>
            </div>
            <button
              onClick={loadFromCurrentSession}
              className="btn-forest"
              style={{ padding: "6px 14px", fontSize: 10 }}
            >
              Auto-Fill Session Data
            </button>
          </div>
        )}

        {/* Buyer Sign-Off Card if launched via share link */}
        {urlReport && (
          <div
            className="card-on-light fade-up"
            style={{ marginBottom: 32, border: "2px solid var(--forest)", padding: "28px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <span className="section-label-light">Roll Identification</span>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700 }}>
                  {urlReport.rollId}
                </div>
              </div>
              <GradeBadge grade={urlReport.grade || urlReport.grading?.grade || "B"} size="md" />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ padding: "10px 14px", background: "var(--champagne)", borderRadius: 8, border: "1px solid #E0CFA8" }}>
                <span style={{ fontSize: 11, color: "var(--ink-dim)", display: "block" }}>Standard</span>
                <strong>{GRADING_STANDARDS_INFO[urlReport.standard as GradingStandard]?.name || "4-Point ASTM D5430"}</strong>
              </div>
              <div style={{ padding: "10px 14px", background: "var(--champagne)", borderRadius: 8, border: "1px solid #E0CFA8" }}>
                <span style={{ fontSize: 11, color: "var(--ink-dim)", display: "block" }}>Agreed Threshold</span>
                <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{urlReport.threshold || urlReport.agreedThreshold} pts</strong>
              </div>
              <div style={{ padding: "10px 14px", background: "var(--champagne)", borderRadius: 8, border: "1px solid #E0CFA8" }}>
                <span style={{ fontSize: 11, color: "var(--ink-dim)", display: "block" }}>Points/100 Sq Yd</span>
                <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {(urlReport.points || urlReport.grading?.pointsPer100SqYd || 0).toFixed(1)}
                </strong>
              </div>
              <div style={{ padding: "10px 14px", background: urlReport.source === "ai" ? "rgba(15,118,110,0.08)" : "#FFF4D6", borderRadius: 8, border: `1px solid ${urlReport.source === "ai" ? "#78BDB6" : "var(--warn)"}` }}>
                <span style={{ fontSize: 11, color: "var(--ink-dim)", display: "block" }}>Inspection Source</span>
                <strong>{urlReport.source === "ai" ? "Live AI model" : "Simulated / fallback"}</strong>
              </div>
            </div>

            {/* Audit Trail preview for buyer */}
            {urlReport.auditTrail && urlReport.auditTrail.length > 0 && (
              <div style={{ marginBottom: 20, padding: "12px", background: "rgba(233, 185, 73, 0.15)", borderRadius: 8, border: "1px solid var(--warn)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <History size={14} color="#8A6200" />
                  <strong style={{ fontSize: 12, textTransform: "uppercase", color: "#8A6200" }}>
                    Mill Reviewer Adjustments ({urlReport.auditTrail.length})
                  </strong>
                </div>
                {urlReport.auditTrail.map((ev: any, i: number) => (
                  <div key={i} style={{ fontSize: 12, fontFamily: "'Spectral', serif", color: "var(--ink)" }}>
                    • {ev.details}
                  </div>
                ))}
              </div>
            )}

            {/* Sign-Off Action Form */}
            {signOffStatus === "none" ? (
              <div style={{ borderTop: "1px solid #E0CFA8", paddingTop: 20 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Your Company / Buyer Name:
                  </label>
                  <input
                    type="text"
                    className="input-dark"
                    style={{ background: "#fff", color: "var(--ink)", borderColor: "#C9BDA8" }}
                    placeholder="e.g., Shingora Textiles / Vardhman Group"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Notes or Reason (optional):
                  </label>
                  <input
                    type="text"
                    className="input-dark"
                    style={{ background: "#fff", color: "var(--ink)", borderColor: "#C9BDA8" }}
                    placeholder="e.g., Passed receiving inspection / Disputing slub on pick #44"
                    value={buyerNotes}
                    onChange={(e) => setBuyerNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", gap: 14 }}>
                  <button
                    onClick={() => handleBuyerSignOff("accepted")}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: 999,
                      background: "var(--pass)",
                      color: "var(--ink)",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "'Unbounded', sans-serif",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Check size={16} />
                    Accept Grade ({urlReport.grade || urlReport.grading?.grade})
                  </button>
                  <button
                    onClick={() => handleBuyerSignOff("disputed")}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: 999,
                      background: "var(--reject)",
                      color: "white",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "'Unbounded', sans-serif",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={16} />
                    Raise Dispute
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "16px",
                  borderRadius: 12,
                  background: signOffStatus === "accepted" ? "rgba(126, 217, 160, 0.25)" : "rgba(232, 97, 90, 0.15)",
                  textAlign: "center",
                  border: `2px solid ${signOffStatus === "accepted" ? "var(--pass)" : "var(--reject)"}`,
                }}
              >
                <h3 style={{ margin: "0 0 6px", fontFamily: "'Unbounded', sans-serif", fontSize: 16 }}>
                  {signOffStatus === "accepted" ? "✓ GRADE ACCEPTED BY BUYER" : "⚠️ DISPUTE RECORDED"}
                </h3>
                <p style={{ margin: 0, fontFamily: "'Spectral', serif", fontSize: 14 }}>
                  Signed off by <strong>{buyerName}</strong> on {new Date().toLocaleTimeString()}. Record updated in local audit history.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Upload Image */}
        <div className="card-on-light" style={{ marginBottom: 24 }}>
            <p className="section-label-light" style={{ marginBottom: 16 }}>Optional — View Original Fabric Image</p>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: "2px dashed #C9BDA8",
              borderRadius: 12,
              padding: "28px",
              cursor: "pointer",
              gap: 10,
              color: "var(--ink-dim)",
              transition: "all 0.2s",
            }}
          >
            <Upload size={26} color="var(--ink-dim)" />
            <span style={{ fontFamily: "'Spectral', serif" }}>
              {imageDataUrl ? "Fabric image loaded ✓" : "Click to select fabric image"}
            </span>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
          </label>
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt="Uploaded fabric"
              style={{
                marginTop: 16,
                width: "100%",
                maxHeight: 220,
                objectFit: "contain",
                borderRadius: 8,
                background: "#000",
              }}
            />
          )}
        </div>

        {/* Step 2: Paste or Upload JSON */}
        <div className="card-on-light" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p className="section-label-light" style={{ margin: 0 }}>Certificate Data JSON</p>
            <label style={{ fontSize: 12, color: "var(--forest)", cursor: "pointer", textDecoration: "underline" }}>
              Upload .json file
              <input type="file" accept=".json" style={{ display: "none" }} onChange={handleJsonFileUpload} />
            </label>
          </div>
          <textarea
            value={reportJSON}
            onChange={(e) => setReportJSON(e.target.value)}
            placeholder="Paste the certificate JSON here (or click 'Auto-Fill Session Data' above)..."
            style={{
              width: "100%",
              minHeight: 140,
              background: "var(--champagne)",
              border: "1px solid #C9BDA8",
              borderRadius: 10,
              padding: "14px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: "var(--ink)",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Verify Button */}
        <button
          className="btn-forest"
          style={{
            width: "100%",
            justifyContent: "center",
            fontSize: 14,
            padding: "16px",
            opacity: !reportJSON ? 0.5 : 1,
            cursor: !reportJSON ? "not-allowed" : "pointer",
          }}
          disabled={!reportJSON || checking}
          onClick={verify}
        >
          {checking ? "Checking with issuing server…" : "Verify with Issuing Server"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 20,
              padding: "14px 18px",
              background: "rgba(232,97,90,0.1)",
              border: "1px solid var(--reject)",
              borderRadius: 12,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <AlertCircle size={20} color="var(--reject)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontFamily: "'Spectral', serif", color: "var(--reject)", fontSize: 14 }}>{error}</p>
          </div>
        )}

        {result && (
          <div
            className="fade-up"
            style={{
              marginTop: 24,
              padding: "32px",
              borderRadius: 20,
              background: result === "match" ? "rgba(126,217,160,0.15)" : "rgba(232,97,90,0.1)",
              border: `2px solid ${result === "match" ? "var(--pass)" : "var(--reject)"}`,
              textAlign: "center",
            }}
          >
            {result === "match" ? (
              <>
                <CheckCircle size={44} color="var(--pass)" style={{ marginBottom: 14 }} />
                <h2
                  style={{
                    fontFamily: "'Unbounded', sans-serif",
                    fontWeight: 800,
                    fontSize: 24,
                    color: "var(--pass)",
                    margin: "0 0 8px",
                  }}
                >
                  SERVER SIGNATURE MATCH — VERIFIED
                </h2>
                <p style={{ fontFamily: "'Spectral', serif", color: "var(--ink)", fontSize: 15, margin: 0 }}>
                  The issuing server confirmed that the signed certificate payload matches its HMAC signature. The image hash identifies the inspected image; it is not a security proof by itself.
                </p>
                {parsedReport && (
                  <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <div style={{ padding: "6px 14px", background: "rgba(16,44,38,0.06)", borderRadius: 8, fontSize: 13 }}>
                      Roll ID: <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{parsedReport.rollId ?? "—"}</strong>
                    </div>
                    <div style={{ padding: "6px 14px", background: "rgba(16,44,38,0.06)", borderRadius: 8, fontSize: 13 }}>
                      Grade: <strong>{parsedReport.grading?.grade ?? parsedReport.grade ?? "—"}</strong>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <XCircle size={44} color="var(--reject)" style={{ marginBottom: 14 }} />
                <h2
                  style={{
                    fontFamily: "'Unbounded', sans-serif",
                    fontWeight: 800,
                    fontSize: 24,
                    color: "var(--reject)",
                    margin: "0 0 8px",
                  }}
                >
                  SERVER SIGNATURE MISMATCH — VERIFICATION FAILED
                </h2>
                <p style={{ fontFamily: "'Spectral', serif", color: "var(--ink)", fontSize: 15, margin: 0 }}>
                  The issuing server rejected the signature. The certificate payload or signature may have been altered, or it may not belong to this issuer.
                </p>
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <button className="btn-forest" onClick={() => navigate("grade")}>
            ← Back to Grading
          </button>
        </div>
      </div>
    </div>
  );
}
