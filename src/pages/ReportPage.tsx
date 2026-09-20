import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../App";
import { AnnotatedImage } from "../components/AnnotatedImage";
import { DefectTable } from "../components/DefectTable";
import { GradeBadge } from "../components/GradeBadge";
import { Download, Copy, CheckCircle, Share2, ShieldCheck, History, Ruler, Check, AlertTriangle } from "lucide-react";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { GRADING_STANDARDS_INFO, type GradingStandard } from "../config/grading";

export const ReportPage: React.FC = () => {
  const { currentReport, navigate } = useContext(AppContext);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (currentReport) {
      if (!currentReport.shareId) return;
      const verifyUrl = `${window.location.origin}/verify?cert=${encodeURIComponent(currentReport.shareId)}`;

      QRCode.toDataURL(verifyUrl, { width: 140, margin: 1 })
        .then((url) => setQrCodeUrl(url))
        .catch(console.error);
    }
  }, [currentReport]);

  if (!currentReport) {
    return (
      <div
        style={{
          padding: "4rem 2rem",
          textAlign: "center",
          backgroundColor: "var(--champagne)",
          minHeight: "100vh",
          color: "var(--ink)",
        }}
      >
        <h2 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: "1.75rem", marginBottom: "1rem" }}>
          No Certificate Found
        </h2>
        <p style={{ marginBottom: "2rem", color: "var(--ink-dim)", fontFamily: "'Spectral', serif" }}>
          Please grade a fabric roll first to generate a server-signed certificate.
        </p>
        <button className="btn-forest" onClick={() => navigate("grade")}>
          Go to Grade Page
        </button>
      </div>
    );
  }

  const { grading, rollId, timestamp, fingerprint, standard = "four_point", calibration, auditTrail = [], buyerSignOff, detection } = currentReport;

  const handleCopy = () => {
    const summary = `thaan.ai Grading Certificate\nRoll ID: ${rollId}\nGrade: ${grading.grade}\nPoints/100sqyd: ${grading.pointsPer100SqYd.toFixed(1)}\nStandard: ${GRADING_STANDARDS_INFO[standard as GradingStandard]?.name || standard}\nAgreed Threshold: ${grading.agreedThreshold}\nFingerprint: ${fingerprint}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyJSON = () => {
    const reportData = {
      id: currentReport.id,
      timestamp: currentReport.timestamp,
      rollId: currentReport.rollId,
      imageHash: currentReport.imageHash,
      fabricWidthIn: currentReport.fabricWidthIn,
      agreedThreshold: currentReport.agreedThreshold,
      standard,
      calibration,
      auditTrail,
      buyerSignOff,
      grading: currentReport.grading,
      fingerprint: currentReport.fingerprint,
      source: currentReport.source,
      shareId: currentReport.shareId,
      signingPayload: currentReport.signingPayload,
    };
    navigator.clipboard.writeText(JSON.stringify(reportData, null, 2));
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  const handleCopyShareLink = () => {
    if (!currentReport.shareId) return;
    const link = `${window.location.origin}/verify?cert=${encodeURIComponent(currentReport.shareId)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Deep forest header
    doc.setFillColor(16, 44, 38);
    doc.rect(0, 0, pageWidth, 42, "F");

    // Champagne background
    doc.setFillColor(247, 231, 206);
    doc.rect(0, 42, pageWidth, pageHeight - 42, "F");

    // Header text
    doc.setTextColor(247, 231, 206);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("thaan.ai", 20, 26);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("SERVER-SIGNED GRADING CERTIFICATE", pageWidth - 20, 26, { align: "right" });

    // Body content
    doc.setTextColor(16, 44, 38);

    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(`Roll ID: ${rollId}`, 20, 58);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${new Date(timestamp).toLocaleString()}`, 20, 66);
    doc.text(`Standard: ${GRADING_STANDARDS_INFO[standard as GradingStandard]?.name || standard}`, 20, 73);
    doc.text(`Fabric Width: ${grading.widthIn}" | Threshold: ${grading.agreedThreshold} pts`, 20, 80);
    doc.text(`Inspection Source: ${currentReport.source === "ai" ? "Live AI model" : "SIMULATED / FALLBACK"}`, 20, 87);
    if (calibration) {
      doc.text(`Calibrated Scale: ${calibration.pixelsPerInch.toFixed(1)} px/in (${calibration.realLengthIn}" ref)`, 20, 94);
    }

    // Grade badge on PDF
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text(`GRADE ${grading.grade}`, pageWidth - 20, 70, { align: "right" });

    doc.setFontSize(12);
    doc.text(`${grading.pointsPer100SqYd.toFixed(1)} pts / 100 sqyd`, pageWidth - 20, 82, { align: "right" });

    // Defect Summary table
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Defect Inspection Table:", 20, 102);

    let y = 112;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    if (grading.scoredDefects.length === 0) {
      doc.text("No defects detected — fabric meets flawless criteria.", 20, y);
      y += 8;
    } else {
      grading.scoredDefects.forEach((d, i) => {
        doc.text(
          `${i + 1}. ${d.type.toUpperCase()} [${d.severity}] - Size: ${d.sizeIn.toFixed(2)}" - Penalty: ${d.points} pt(s) - Conf: ${(d.confidence * 100).toFixed(0)}%`,
          20,
          y
        );
        y += 7;
        if (y > pageHeight - 50) {
          doc.addPage();
          doc.setFillColor(247, 231, 206);
          doc.rect(0, 0, pageWidth, pageHeight, "F");
          doc.setTextColor(16, 44, 38);
          y = 20;
        }
      });
    }

    // Audit Trail section on PDF
    if (auditTrail.length > 0) {
      y += 6;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Reviewer Audit Trail (${auditTrail.length} human edits logged):`, 20, y);
      y += 7;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      auditTrail.forEach((ev) => {
        doc.text(`• [${new Date(ev.timestamp).toLocaleTimeString()}] ${ev.details}`, 24, y);
        y += 5;
      });
    }

    // Fingerprint and QR code
    y = Math.max(y + 14, pageHeight - 40);
    doc.setFontSize(8);
    doc.setFont("courier", "normal");
    doc.text(`Server HMAC Signature: ${fingerprint}`, 20, y);
    doc.setFont("helvetica", "italic");
    doc.text("Scan QR code or use thaan.ai/verify to confirm this certificate with the issuing server.", 20, y + 6);

    if (qrCodeUrl) {
      doc.addImage(qrCodeUrl, "PNG", pageWidth - 45, y - 16, 26, 26);
    }

    doc.save(`thaan-certificate-${rollId}.pdf`);
  };

  return (
    <div style={{ backgroundColor: "var(--champagne)", minHeight: "100vh", color: "var(--ink)", padding: "2.5rem 1.5rem" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Buyer Sign-off banner if already acted */}
        {buyerSignOff && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              background: buyerSignOff.status === "accepted" ? "rgba(126, 217, 160, 0.25)" : "rgba(232, 97, 90, 0.15)",
              border: `2px solid ${buyerSignOff.status === "accepted" ? "var(--pass)" : "var(--reject)"}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {buyerSignOff.status === "accepted" ? <Check size={22} color="#1B6336" /> : <AlertTriangle size={22} color="var(--reject)" />}
            <div>
              <strong style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, textTransform: "uppercase" }}>
                Buyer Status: {buyerSignOff.status === "accepted" ? "ACCEPTED BY BUYER" : "DISPUTED BY BUYER"}
              </strong>
              <p style={{ margin: 0, fontFamily: "'Spectral', serif", fontSize: 14 }}>
                Signed by <strong>{buyerSignOff.buyerName}</strong> on {new Date(buyerSignOff.timestamp).toLocaleString()}
                {buyerSignOff.notes ? ` — "${buyerSignOff.notes}"` : ""}
              </p>
            </div>
          </div>
        )}

        {/* Top Header & Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="section-label-light" style={{ marginBottom: 6 }}>Official Certificate</div>
            <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: "2rem", fontWeight: 800, margin: 0 }}>
              Grading Certificate
            </h1>
            <p style={{ color: "var(--ink-dim)", margin: "0.4rem 0 0 0", fontFamily: "'Spectral', serif", fontStyle: "italic" }}>
              Generated on {new Date(timestamp).toLocaleString()}
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {/* Share Buyer Link button */}
            <button
              onClick={handleCopyShareLink}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.25rem",
                borderRadius: "999px",
                cursor: "pointer",
                border: "1px solid var(--forest)",
                backgroundColor: "var(--forest)",
                color: "var(--champagne)",
                fontWeight: 600,
                fontFamily: "'Unbounded', sans-serif",
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                boxShadow: "0 4px 14px rgba(16,44,38,0.2)",
              }}
              title="Copy shareable link for buyer to accept or dispute"
            >
              {copiedLink ? <CheckCircle size={15} color="var(--pass)" /> : <Share2 size={15} />}
              {copiedLink ? "Link Copied!" : "Share Buyer Sign-Off Link"}
            </button>

            <button
              onClick={handleCopy}
              className="btn-ghost"
              style={{ color: "var(--ink)", borderColor: "#C9BDA8", borderRadius: 999 }}
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Summary"}
            </button>

            <button
              onClick={handleCopyJSON}
              className="btn-ghost"
              style={{ color: "var(--ink)", borderColor: "#C9BDA8", borderRadius: 999 }}
              title="Copy raw certificate JSON"
            >
              {copiedJSON ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copiedJSON ? "JSON Copied" : "JSON"}
            </button>

            <button
              className="btn-forest"
              onClick={handleDownloadPDF}
              style={{ borderRadius: 999, padding: "0.75rem 1.25rem", fontSize: 11 }}
            >
              <Download size={15} />
              PDF Certificate
            </button>
          </div>
        </div>

        <div className="card-on-light" style={{ padding: "1.5rem 2rem", border: "1px solid #E0CFA8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <div className="section-label-light">AI Fabric Profile</div>
              <h2 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: "1.15rem", margin: "6px 0 0" }}>{detection.fabric_type_guess}</h2>
            </div>
            <span className="font-mono" style={{ color: "#1B6336", fontSize: 12 }}>{Math.round((detection.metadata_confidence ?? 0) * 100)}% confidence</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {[['Material', detection.material], ['Color', detection.color], ['Construction', detection.weave_or_knit], ['Finish', detection.finish]].map(([label, value]) => (
              <div key={label} style={{ padding: "10px 12px", background: "var(--champagne)", borderRadius: 8 }}>
                <div className="section-label-light" style={{ fontSize: 9 }}>{label}</div>
                <div style={{ fontFamily: "'Spectral', serif", fontSize: 15, fontWeight: 600 }}>{value || "Unknown"}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          role="status"
          style={{
            padding: "14px 18px",
            borderRadius: 10,
            background: currentReport.source === "ai" ? "rgba(15, 118, 110, 0.08)" : "#FFF4D6",
            border: `2px solid ${currentReport.source === "ai" ? "#78BDB6" : "var(--warn)"}`,
            color: "var(--ink)",
            fontFamily: "'Spectral', serif",
          }}
        >
          <strong>{currentReport.source === "ai" ? "AI-generated inspection" : "SIMULATED / DEMO INSPECTION"}</strong>
          {currentReport.source !== "ai" && " — This certificate contains fallback data and must not be used as a production quality decision."}
        </div>

        {/* Certificate Card */}
        <div className="card-on-light" style={{ padding: "2rem", border: "1px solid #E0CFA8" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
            <div>
              <div className="section-label-light">Roll ID</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.15rem", fontWeight: 700, color: "var(--ink)" }}>
                {rollId}
              </div>
            </div>
            <div>
              <div className="section-label-light">Standard</div>
              <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)" }}>
                {GRADING_STANDARDS_INFO[standard as GradingStandard]?.name || standard}
              </div>
            </div>
            <div>
              <div className="section-label-light">Fabric Width</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.15rem", fontWeight: 600 }}>
                {grading.widthIn}"
              </div>
            </div>
            <div>
              <div className="section-label-light">Threshold</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.15rem", fontWeight: 600 }}>
                {grading.agreedThreshold}
              </div>
            </div>
            <div>
              <div className="section-label-light">Total Points</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.15rem", fontWeight: 700 }}>
                {grading.totalPoints}
              </div>
            </div>
            <div>
              <div className="section-label-light">Density Score</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.15rem", fontWeight: 700 }}>
                {grading.pointsPer100SqYd.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="section-label-light">Grade</div>
              <div style={{ marginTop: 4 }}>
                <GradeBadge grade={grading.grade} size="sm" />
              </div>
            </div>

            <div
              style={{
                gridColumn: "1 / -1",
                padding: "12px 16px",
                borderRadius: 8,
                background: grading.grade === "REJECT" ? "rgba(232, 106, 91, 0.12)" : "rgba(15, 118, 110, 0.08)",
                border: `1px solid ${grading.grade === "REJECT" ? "var(--reject)" : "#B9DAD5"}`,
                color: "var(--ink)",
                fontFamily: "'Spectral', serif",
                fontSize: 14,
              }}
            >
              <strong>{grading.grade === "REJECT" ? "Rejection basis: " : "Decision basis: "}</strong>{grading.gradeReason}
            </div>
          </div>

          {/* Calibration info */}
          {calibration && (
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "10px 16px",
                background: "rgba(126, 217, 160, 0.15)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                fontFamily: "'Spectral', serif",
              }}
            >
              <Ruler size={16} color="#1B6336" />
              <span>
                <strong>Defect scale calibrated in true physical inches:</strong> {calibration.pixelsPerInch.toFixed(1)} px/in (via {calibration.realLengthIn}" reference object).
              </span>
            </div>
          )}

          {/* Digital Fingerprint and QR code */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1.25rem",
              backgroundColor: "var(--champagne)",
              borderRadius: "12px",
              border: "1px solid #E0CFA8",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <ShieldCheck size={16} color="#1B6336" />
                <span className="section-label-light">Server HMAC Certificate Signature</span>
              </div>
              <div
                className="font-mono"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.85rem",
                  wordBreak: "break-all",
                  color: "var(--ink)",
                }}
              >
                {fingerprint}
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 12, fontFamily: "'Spectral', serif", fontStyle: "italic", color: "var(--ink-dim)" }}>
                Verified by the issuing server against the signed report payload. The image SHA-256 is used for content identity only.
              </p>
            </div>
            {qrCodeUrl && (
              <div style={{ textAlign: "center" }}>
                <img src={qrCodeUrl} alt="Verification QR Code" style={{ width: 88, height: 88, borderRadius: 8, border: "1px solid #C9BDA8" }} />
                <div style={{ fontSize: 10, fontFamily: "'Unbounded', sans-serif", color: "var(--ink-dim)", marginTop: 4 }}>
                  SCAN TO VERIFY
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Annotated Fabric Image */}
        <div className="card-on-light" style={{ padding: "2rem", border: "1px solid #E0CFA8" }}>
          <h2 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: "1.25rem", fontWeight: 700, margin: "0 0 1rem" }}>
            Inspection Image with Defect Overlays
          </h2>
          <AnnotatedImage
            imageDataUrl={currentReport.imageDataUrl}
            defects={grading.scoredDefects}
            calibration={calibration}
          />
        </div>

        {/* Defect Table */}
        <div className="card-on-light" style={{ padding: "2rem", border: "1px solid #E0CFA8" }}>
          <h2 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: "1.25rem", fontWeight: 700, margin: "0 0 1rem" }}>
            Defect Penalty Ledger
          </h2>
          <DefectTable defects={grading.scoredDefects} editable={false} theme="light" />
        </div>

        {/* Audit Trail Section */}
        {auditTrail.length > 0 && (
          <div className="card-on-light" style={{ padding: "2rem", border: "1px solid #E0CFA8", borderLeft: "4px solid var(--warn)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <History size={18} color="#8A6200" />
              <h2 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                Reviewer Audit Trail ({auditTrail.length} Human Actions Logged)
              </h2>
            </div>
            <p style={{ fontFamily: "'Spectral', serif", fontSize: 14, color: "var(--ink-dim)", margin: "0 0 14px" }}>
              Every human adjustment is timestamped and included in the server-signed certificate payload:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {auditTrail.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "var(--champagne)",
                    borderRadius: 6,
                    border: "1px solid #E0CFA8",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontFamily: "'Spectral', serif", color: "var(--ink)" }}>{ev.details}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--ink-dim)" }}>
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
