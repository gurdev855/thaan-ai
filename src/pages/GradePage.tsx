import React, { useCallback, useContext, useRef, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Zap,
  AlertCircle,
  CheckCircle,
  Sliders,
  Ruler,
  History,
  ShieldCheck,
} from "lucide-react";
import { AppContext } from "../App";
import { detectDefects } from "../api/detect";
import {
  gradeDefects,
  type Defect,
  type ScoredDefect,
  type GradingResult,
  type CalibrationData,
  type AuditEvent,
} from "../engine/grading";
import { sha256Hex } from "../utils/crypto";
import { signReport } from "../api/trust";
import { addHistoryEntry } from "../utils/history";
import {
  SAMPLE_IMAGES,
  DEFAULT_FABRIC_WIDTH_IN,
  DEFAULT_AGREED_THRESHOLD,
  GRADING_STANDARDS_INFO,
  TEN_POINT_RULES,
  DEFAULT_CUSTOM_RULES,
  CALIBRATION_PRESETS,
  type GradingStandard,
  type CustomStandardRules,
} from "../config/grading";
import { AnnotatedImage, ScanningImage } from "../components/AnnotatedImage";
import { DefectTable } from "../components/DefectTable";
import { GradeBadge } from "../components/GradeBadge";
import type { HistoryEntry } from "../utils/history";

type Step = "upload" | "analyzing" | "results" | "error";

function generateRollId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ROLL-${ts}-${rand}`;
}

export function GradePage() {
  const { navigate, setCurrentReport, demoMode, setDemoMode } = useContext(AppContext);

  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [fabricWidthIn, setFabricWidthIn] = useState(DEFAULT_FABRIC_WIDTH_IN);
  const [agreedThreshold, setAgreedThreshold] = useState(DEFAULT_AGREED_THRESHOLD);

  // Feature 1: Multiple Grading Standards
  const [standard, setStandard] = useState<GradingStandard>("four_point");
  const [customRules, setCustomRules] = useState<CustomStandardRules>(DEFAULT_CUSTOM_RULES);
  const [showCustomConfig, setShowCustomConfig] = useState(false);

  // Feature 2: Size Calibration
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [selectedCalibPresetIdx, setSelectedCalibPresetIdx] = useState(0);
  const [customCalibLength, setCustomCalibLength] = useState(6);
  const [tempPixelDist, setTempPixelDist] = useState<number | null>(null);
  const [tempPoints, setTempPoints] = useState<{
    p1: { x: number; y: number };
    p2: { x: number; y: number };
  } | null>(null);

  // Feature 4: Audit Trail
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);

  const [defects, setDefects] = useState<Defect[]>([]);
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 1000, h: 1000 });
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [imageHash, setImageHash] = useState<string>("");
  const [fabricTypeGuess, setFabricTypeGuess] = useState("");
  const [material, setMaterial] = useState("");
  const [fabricColor, setFabricColor] = useState("");
  const [weaveOrKnit, setWeaveOrKnit] = useState("");
  const [finish, setFinish] = useState("");
  const [metadataConfidence, setMetadataConfidence] = useState(0);
  const [imageQuality, setImageQuality] = useState<"good" | "poor">("good");
  const [errorMsg, setErrorMsg] = useState("");
  const [fromDemo, setFromDemo] = useState(false);
  const [source, setSource] = useState<"ai" | "fallback">("ai");
  const [analysisMs, setAnalysisMs] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const regrade = useCallback(
    (
      newDefects: Defect[],
      currentAudit: AuditEvent[] = auditTrail,
      calib: CalibrationData | null = calibration,
      currentStd: GradingStandard = standard,
      rules: CustomStandardRules = customRules
    ) => {
      const result = gradeDefects({
        defects: newDefects,
        fabricWidthIn,
        imageWidth: imageNaturalSize.w,
        imageHeight: imageNaturalSize.h,
        agreedThreshold,
        standard: currentStd,
        customRules: rules,
        calibration: calib,
        auditTrail: currentAudit,
      });
      setGradingResult(result);
    },
    [fabricWidthIn, imageNaturalSize, agreedThreshold, auditTrail, calibration, standard, customRules]
  );

  const handleStandardChange = (newStd: GradingStandard) => {
    setStandard(newStd);
    let defaultThresh = 40;
    if (newStd === "ten_point") defaultThresh = TEN_POINT_RULES.B_MAX;
    if (newStd === "custom") defaultThresh = customRules.gradeBMax;
    setAgreedThreshold(defaultThresh);
    if (defects.length > 0) {
      regrade(defects, auditTrail, calibration, newStd, customRules);
    }
  };

  const loadImageFromDataUrl = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = dataUrl;
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please choose a JPG, PNG, or WEBP image.");
      setStep("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Image is larger than 10 MB. Please compress it before uploading.");
      setStep("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImageDataUrl(dataUrl);
      setImageFile(file);
      setSelectedSampleId(null);
      loadImageFromDataUrl(dataUrl);
      setCalibration(null);
      setAuditTrail([]);
      setStep("upload");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const handleSampleSelect = async (sample: (typeof SAMPLE_IMAGES)[0]) => {
    setSelectedSampleId(sample.id);
    setImageFile(null);
    setCalibration(null);
    setAuditTrail([]);
    setStep("upload");
    try {
      const resp = await fetch(sample.path);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImageDataUrl(dataUrl);
        loadImageFromDataUrl(dataUrl);
      };
      reader.readAsDataURL(blob);
    } catch {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#8B7355";
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = "rgba(247,231,206,0.8)";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(sample.label, 400, 300);
      }
      const dataUrl = canvas.toDataURL("image/jpeg");
      setImageDataUrl(dataUrl);
      setImageNaturalSize({ w: 800, h: 600 });
    }
  };

  const runGrading = async () => {
    if (!imageDataUrl) return;
    setStep("analyzing");
    setErrorMsg("");

    try {
      const base64 = imageDataUrl.split(",")[1] ?? imageDataUrl;
      const hash = await sha256Hex(imageDataUrl);
      setImageHash(hash);

      const t0 = Date.now();
      const result = await detectDefects(base64, selectedSampleId ?? undefined, demoMode);
      setAnalysisMs(result.durationMs > 0 ? result.durationMs : Date.now() - t0);
      setFromDemo(result.fromDemo);
      setSource(result.result.source);

      const detectedDefects: Defect[] = result.result.defects.map((d, i) => ({
        ...d,
        id: d.id || `defect-${i}-${Date.now()}`,
      }));

      setDefects(detectedDefects);
      setFabricTypeGuess(result.result.fabric_type_guess);
      setMaterial(result.result.material);
      setFabricColor(result.result.color);
      setWeaveOrKnit(result.result.weave_or_knit);
      setFinish(result.result.finish);
      setMetadataConfidence(result.result.metadata_confidence);
      setImageQuality(result.result.image_quality);

      const graded = gradeDefects({
        defects: detectedDefects,
        fabricWidthIn,
        imageWidth: imageNaturalSize.w,
        imageHeight: imageNaturalSize.h,
        agreedThreshold,
        standard,
        customRules,
        calibration,
        auditTrail,
      });
      setGradingResult(graded);
      setStep("results");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStep("error");
    }
  };

  // Calibration point selection handler from canvas
  const handleCalibrationSelected = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    pixelDist: number
  ) => {
    setTempPoints({ p1, p2 });
    setTempPixelDist(pixelDist);
  };

  const applyCalibration = () => {
    if (!tempPoints || !tempPixelDist) return;
    const preset = CALIBRATION_PRESETS[selectedCalibPresetIdx];
    const realLength = preset.lengthIn > 0 ? preset.lengthIn : customCalibLength;
    if (realLength <= 0) return;

    const ppi = tempPixelDist / realLength;
    const newCalib: CalibrationData = {
      p1: tempPoints.p1,
      p2: tempPoints.p2,
      realLengthIn: realLength,
      pixelsPerInch: ppi,
    };
    setCalibration(newCalib);
    setCalibrationMode(false);

    // Add to audit trail
    const calibEvent: AuditEvent = {
      id: `audit-${Date.now()}`,
      timestamp: Date.now(),
      defectId: "system",
      action: "calibrated_scale",
      details: `Calibrated real-world scale: ${ppi.toFixed(1)} px/in using ${realLength}" reference.`,
    };
    const updatedTrail = [calibEvent, ...auditTrail];
    setAuditTrail(updatedTrail);

    if (defects.length > 0) {
      regrade(defects, updatedTrail, newCalib, standard, customRules);
    }
  };

  const handleUpdateDefect = (id: string, updates: Partial<Pick<Defect, "type" | "severity">>) => {
    const target = defects.find((d) => d.id === id);
    const defectIdx = defects.findIndex((d) => d.id === id) + 1;

    let auditDetail = "";
    let auditAction: AuditEvent["action"] = "modified_type";

    if (updates.type && target && updates.type !== target.type) {
      auditAction = "modified_type";
      auditDetail = `Changed defect #${defectIdx} type from "${target.type}" to "${updates.type}"`;
    } else if (updates.severity && target && updates.severity !== target.severity) {
      auditAction = "modified_severity";
      auditDetail = `Changed defect #${defectIdx} severity from "${target.severity}" to "${updates.severity}"`;
    }

    const updatedTrail: AuditEvent[] = auditDetail
      ? [
          {
            id: `audit-${Date.now()}`,
            timestamp: Date.now(),
            defectId: id,
            action: auditAction,
            details: auditDetail,
          },
          ...auditTrail,
        ]
      : auditTrail;

    const updated = defects.map((d) => (d.id === id ? { ...d, ...updates } : d));
    setAuditTrail(updatedTrail);
    setDefects(updated);
    regrade(updated, updatedTrail);
  };

  const handleDeleteDefect = (id: string) => {
    const target = defects.find((d) => d.id === id);
    const defectIdx = defects.findIndex((d) => d.id === id) + 1;

    const updatedTrail: AuditEvent[] = [
      {
        id: `audit-${Date.now()}`,
        timestamp: Date.now(),
        defectId: id,
        action: "deleted",
        details: `Deleted false positive detection #${defectIdx} (${target?.type || "defect"})`,
      },
      ...auditTrail,
    ];

    const updated = defects.filter((d) => d.id !== id);
    setAuditTrail(updatedTrail);
    setDefects(updated);
    regrade(updated, updatedTrail);
  };

  const saveReportAndNavigate = async () => {
    if (!imageDataUrl || !gradingResult || saving) return;
    setSaving(true);
    const id = crypto.randomUUID();
    const rollId = generateRollId();
    const signingPayload = {
      id,
      timestamp: Date.now(),
      rollId,
      imageHash,
      fabricWidthIn,
      agreedThreshold,
      standard,
      calibration,
      auditTrail,
      detection: { fabric_type_guess: fabricTypeGuess, material, color: fabricColor, weave_or_knit: weaveOrKnit, finish, metadata_confidence: metadataConfidence, image_quality: imageQuality, defects, source },
      grading: gradingResult,
      source,
    };
    const signed = await signReport(signingPayload);

    const entry: HistoryEntry = {
      id,
      timestamp: signingPayload.timestamp,
      rollId,
      imageHash,
      imageDataUrl,
      fabricWidthIn,
      material,
      color: fabricColor,
      weaveOrKnit,
      finish,
      agreedThreshold,
      standard,
      calibration,
      auditTrail,
      buyerSignOff: null,
      detection: signingPayload.detection,
      grading: gradingResult,
      fingerprint: signed.fingerprint,
      shareId: signed.shareId,
      signingPayload,
      source,
    };
    addHistoryEntry(entry);
    setCurrentReport(entry);
    navigate("report");
    setSaving(false);
  };

  const saveCertificate = async () => {
    try {
      await saveReportAndNavigate();
    } catch (err: unknown) {
      setSaving(false);
      setErrorMsg(err instanceof Error ? err.message : "Unable to sign certificate with the issuing server.");
    }
  };

  const scoredDefects: ScoredDefect[] = gradingResult?.scoredDefects ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--forest)" }} className="woven-texture">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p className="section-label">Grade Screen</p>
          <h1
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
              color: "var(--champagne)",
              margin: "8px 0 16px",
              lineHeight: 1.1,
            }}
          >
            Fabric Grading
          </h1>
          <p style={{ color: "var(--champagne-dim)", maxWidth: 640, margin: 0 }}>
            AI finds defects. Code grades by your chosen standard (4-Point, 10-Point, or Custom). Calibrate true inches with a reference object.
          </p>
        </div>

        {/* Step 1: Upload */}
        <div className="card-dark" style={{ marginBottom: 24 }}>
          <p className="section-label" style={{ marginBottom: 16 }}>
            (Step 1) Upload or choose a sample
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {SAMPLE_IMAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSampleSelect(s)}
                style={{
                  background: selectedSampleId === s.id ? "var(--forest-3)" : "var(--forest)",
                  border: `2px solid ${selectedSampleId === s.id ? "var(--champagne)" : "var(--forest-3)"}`,
                  borderRadius: 12,
                  padding: "12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  color: "var(--champagne)",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🧵</div>
                <p
                  style={{
                    fontFamily: "'Unbounded', sans-serif",
                    fontSize: 11,
                    fontWeight: 500,
                    margin: "0 0 4px",
                    lineHeight: 1.3,
                    color: selectedSampleId === s.id ? "var(--champagne)" : "var(--champagne-dim)",
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    fontFamily: "'Spectral', serif",
                    fontStyle: "italic",
                    fontSize: 12,
                    margin: 0,
                    color: "var(--champagne-dim)",
                    lineHeight: 1.4,
                  }}
                >
                  {s.description}
                </p>
                {selectedSampleId === s.id && (
                  <div style={{ marginTop: 8 }}>
                    <CheckCircle size={14} color="var(--pass)" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div
            style={{
              textAlign: "center",
              color: "var(--champagne-dim)",
              fontFamily: "'Spectral', serif",
              fontStyle: "italic",
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            — or upload your own fabric photo —
          </div>

          <div
            className={`drop-zone ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "36px 20px",
              textAlign: "center",
              cursor: "pointer",
              borderRadius: 16,
            }}
          >
            <Upload size={32} color="var(--champagne-dim)" style={{ marginBottom: 12 }} />
            <p style={{ color: "var(--champagne-dim)", margin: "0 0 8px", fontFamily: "'Spectral', serif" }}>
              Drag & drop or click to upload
            </p>
            <p style={{ fontSize: 13, color: "var(--champagne-dim)", opacity: 0.6, margin: 0, fontFamily: "'Spectral', serif" }}>
              JPG, PNG, WEBP up to 10 MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {imageDataUrl && step !== "analyzing" && (
            <div style={{ marginTop: 20 }}>
              <img
                src={imageDataUrl}
                alt="Selected fabric"
                style={{
                  width: "100%",
                  maxHeight: 280,
                  objectFit: "contain",
                  borderRadius: 12,
                  background: "#000",
                }}
              />
            </div>
          )}
        </div>

        {/* Step 2: Parameters & Standards */}
        <div className="card-dark" style={{ marginBottom: 24 }}>
          <p className="section-label" style={{ marginBottom: 16 }}>
            (Step 2) Grading Standards & True-Inch Calibration
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
              marginBottom: 20,
            }}
          >
            {/* Standard Dropdown */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "var(--champagne-dim)",
                  fontFamily: "'Unbounded', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Grading Standard
              </label>
              <select
                className="select-dark"
                value={standard}
                onChange={(e) => handleStandardChange(e.target.value as GradingStandard)}
                style={{ width: "100%" }}
              >
                <option value="four_point">4-Point System (ASTM D5430 - Export)</option>
                <option value="ten_point">10-Point System (Traditional Woolens)</option>
                <option value="custom">Custom Buyer Standard (Configurable)</option>
              </select>
              <p style={{ fontFamily: "'Spectral', serif", fontStyle: "italic", fontSize: 13, color: "var(--champagne-dim)", marginTop: 6 }}>
                {GRADING_STANDARDS_INFO[standard].description}
              </p>
            </div>

            {/* Agreed Threshold */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "var(--champagne-dim)",
                  fontFamily: "'Unbounded', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Agreed Threshold
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    marginLeft: 8,
                    color: "var(--warn)",
                  }}
                >
                  {agreedThreshold} {GRADING_STANDARDS_INFO[standard].unit}
                </span>
              </label>
              <input
                type="range"
                min={standard === "ten_point" ? 30 : 15}
                max={standard === "ten_point" ? 120 : 80}
                step={5}
                value={agreedThreshold}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAgreedThreshold(val);
                  if (defects.length > 0) regrade(defects, auditTrail, calibration, standard, customRules);
                }}
                style={{ width: "100%", marginTop: 4 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "var(--champagne-dim)", fontFamily: "'Spectral', serif" }}>Strict</span>
                <span style={{ fontSize: 11, color: "var(--champagne-dim)", fontFamily: "'Spectral', serif" }}>Lenient</span>
              </div>
            </div>

            {/* Fabric Width */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "var(--champagne-dim)",
                  fontFamily: "'Unbounded', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Fabric Width (inches)
              </label>
              <input
                type="number"
                className="input-dark"
                value={fabricWidthIn}
                min={30}
                max={120}
                step={1}
                onChange={(e) => setFabricWidthIn(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Custom Standard Builder Accordion */}
          {standard === "custom" && (
            <div
              style={{
                marginBottom: 20,
                padding: "16px 20px",
                background: "var(--forest)",
                border: "1px solid var(--forest-3)",
                borderRadius: 12,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                onClick={() => setShowCustomConfig(!showCustomConfig)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sliders size={16} color="var(--warn)" />
                  <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 12, fontWeight: 700, color: "var(--champagne)" }}>
                    Configure Custom Buyer Tiers & Penalties
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--champagne-dim)" }}>
                  {showCustomConfig ? "Hide ▲" : "Edit Tiers ▼"}
                </span>
              </div>

              {showCustomConfig && (
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--champagne-dim)", display: "block", marginBottom: 4 }}>
                      Tier 1 Max (in) & Pts
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="number"
                        className="input-dark"
                        min={0.1}
                        max={24}
                        step={0.1}
                        value={customRules.tier1MaxIn}
                        onChange={(e) => setCustomRules({ ...customRules, tier1MaxIn: Number(e.target.value) })}
                      />
                      <input
                        type="number"
                        className="input-dark"
                        min={1}
                        max={20}
                        step={1}
                        value={customRules.tier1Pts}
                        onChange={(e) => setCustomRules({ ...customRules, tier1Pts: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--champagne-dim)", display: "block", marginBottom: 4 }}>
                      Tier 2 Max (in) & Pts
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="number"
                        className="input-dark"
                        min={0.1}
                        max={36}
                        step={0.1}
                        value={customRules.tier2MaxIn}
                        onChange={(e) => setCustomRules({ ...customRules, tier2MaxIn: Number(e.target.value) })}
                      />
                      <input
                        type="number"
                        className="input-dark"
                        min={1}
                        max={20}
                        step={1}
                        value={customRules.tier2Pts}
                        onChange={(e) => setCustomRules({ ...customRules, tier2Pts: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--champagne-dim)", display: "block", marginBottom: 4 }}>
                      Grade A Max Cutoff
                    </label>
                    <input
                      type="number"
                      className="input-dark"
                      value={customRules.gradeAMax}
                      onChange={(e) => setCustomRules({ ...customRules, gradeAMax: Number(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Size Calibration Box */}
          <div
            style={{
              padding: "16px 20px",
              background: calibration ? "rgba(126, 217, 160, 0.08)" : "var(--forest)",
              border: `1px solid ${calibration ? "var(--pass)" : "var(--forest-3)"}`,
              borderRadius: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Ruler size={18} color={calibration ? "var(--pass)" : "var(--champagne-dim)"} />
                <div>
                  <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 12, fontWeight: 700, color: "var(--champagne)" }}>
                    {calibration ? "Defect Size Calibrated (True Inches)" : "Size Calibration Tool"}
                  </span>
                  <p style={{ margin: 0, fontFamily: "'Spectral', serif", fontSize: 13, color: "var(--champagne-dim)" }}>
                    {calibration
                      ? `Scale: ${calibration.pixelsPerInch.toFixed(1)} px/in (Calibrated using ${calibration.realLengthIn}" reference object)`
                      : "Tap 2 points on a ruler or A4 sheet to compute true defect inches instead of estimating."}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className={calibrationMode ? "btn-primary" : "btn-ghost"}
                  onClick={() => setCalibrationMode(!calibrationMode)}
                  style={{ padding: "8px 16px" }}
                >
                  {calibrationMode ? "Cancel Calibration" : calibration ? "Re-Calibrate" : "📏 Tap 2 Points to Calibrate"}
                </button>
                {calibration && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setCalibration(null);
                      if (defects.length > 0) regrade(defects, auditTrail, null);
                    }}
                    style={{ padding: "8px 12px" }}
                  >
                    Reset Scale
                  </button>
                )}
              </div>
            </div>

            {/* Calibration Controls if in calibration mode */}
            {calibrationMode && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--forest-3)" }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--champagne-dim)", display: "block", marginBottom: 4 }}>
                      Reference Object Preset:
                    </label>
                    <select
                      className="select-dark"
                      value={selectedCalibPresetIdx}
                      onChange={(e) => setSelectedCalibPresetIdx(Number(e.target.value))}
                      style={{ fontSize: 13 }}
                    >
                      {CALIBRATION_PRESETS.map((p, idx) => (
                        <option key={idx} value={idx}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {CALIBRATION_PRESETS[selectedCalibPresetIdx].lengthIn === 0 && (
                    <div>
                      <label style={{ fontSize: 11, color: "var(--champagne-dim)", display: "block", marginBottom: 4 }}>
                        Real Length (inches):
                      </label>
                      <input
                        type="number"
                        className="input-dark"
                        min={0}
                        max={100}
                        step={1}
                        style={{ width: 100 }}
                        value={customCalibLength}
                        onChange={(e) => setCustomCalibLength(Number(e.target.value))}
                      />
                    </div>
                  )}

                  <div style={{ alignSelf: "flex-end" }}>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={!tempPoints || !tempPixelDist}
                      onClick={applyCalibration}
                      style={{
                        padding: "10px 20px",
                        opacity: !tempPoints || !tempPixelDist ? 0.5 : 1,
                        cursor: !tempPoints || !tempPixelDist ? "not-allowed" : "pointer",
                      }}
                    >
                      Apply True-Inch Scale
                    </button>
                  </div>
                </div>
                <p style={{ fontFamily: "'Spectral', serif", fontStyle: "italic", fontSize: 13, color: "var(--pass)", marginTop: 10 }}>
                  (Click Point 1 then Point 2 on the image above. Distance captured: {tempPixelDist ? `${tempPixelDist.toFixed(1)} px` : "waiting for clicks..."})
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Run Grading */}
        <div className="card-dark" style={{ marginBottom: 24 }}>
          <p className="section-label" style={{ marginBottom: 16 }}>
            (Step 3) Run grading
          </p>
          <button
            className="btn-primary"
            style={{
              fontSize: 15,
              padding: "18px 40px",
              opacity: !imageDataUrl ? 0.5 : 1,
              cursor: !imageDataUrl ? "not-allowed" : "pointer",
            }}
            disabled={!imageDataUrl || step === "analyzing"}
            onClick={runGrading}
          >
            <Zap size={18} />
            {step === "analyzing" ? "Analyzing…" : `Grade via ${GRADING_STANDARDS_INFO[standard].name}`}
          </button>
        </div>

        {/* Analyzing state */}
        {step === "analyzing" && imageDataUrl && (
          <div className="card-dark fade-up" style={{ marginBottom: 24 }}>
            <p className="section-label" style={{ marginBottom: 16 }}>
              (AI Analysis) Detecting defects
            </p>
            <ScanningImage imageDataUrl={imageDataUrl} />
            <p style={{ color: "var(--champagne-dim)", fontFamily: "'Spectral', serif", marginTop: 16, textAlign: "center", fontStyle: "italic" }}>
              Sending image to vision model · Analyzing thread structure & weave consistency…
            </p>
          </div>
        )}

        {/* Error state */}
        {step === "error" && (
          <div
            className="fade-up"
            style={{
              background: "rgba(232, 97, 90, 0.1)",
              border: "1px solid var(--reject)",
              borderRadius: 16,
              padding: "24px",
              marginBottom: 24,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <AlertCircle size={24} color="var(--reject)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p
                style={{
                  fontFamily: "'Unbounded', sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--reject)",
                  margin: "0 0 8px",
                }}
              >
                Detection failed
              </p>
              <p style={{ color: "var(--champagne-dim)", fontFamily: "'Spectral', serif", margin: "0 0 16px", fontSize: 14 }}>
                {errorMsg}
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-reject" onClick={runGrading}>
                  Retry
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setDemoMode(true);
                    runGrading();
                  }}
                >
                  Use Demo Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {step === "results" && gradingResult && imageDataUrl && (
          <div className="fade-up">
            {errorMsg && (
              <div role="alert" style={{ marginBottom: 24, padding: "14px 18px", borderRadius: 10, background: "rgba(232, 106, 91, 0.12)", border: "2px solid var(--reject)", color: "var(--reject)" }}>
                <strong>Certificate action failed:</strong> {errorMsg}
              </div>
            )}
            {fromDemo && (
              <div
                role="alert"
                style={{
                  marginBottom: 24,
                  padding: "18px 20px",
                  background: "#FFF4D6",
                  border: "3px solid var(--warn)",
                  borderRadius: 12,
                  color: "#5C4300",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <AlertCircle size={24} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ display: "block", fontFamily: "'Unbounded', sans-serif", fontSize: 13, textTransform: "uppercase" }}>
                    Simulated inspection result
                  </strong>
                  <span style={{ fontFamily: "'Spectral', serif", fontSize: 15 }}>
                    This grade uses demo/fallback data, not a live vision model. Do not use it as a production quality decision.
                  </span>
                </div>
              </div>
            )}
            {/* Info bar */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              <div
                style={{
                  padding: "8px 16px",
                  background: "var(--forest-2)",
                  border: "1px solid var(--forest-3)",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontFamily: "'Spectral', serif", fontSize: 13, color: "var(--champagne-dim)" }}>
                  Standard: <strong style={{ color: "var(--champagne)" }}>{GRADING_STANDARDS_INFO[standard].name}</strong>
                </span>
              </div>
              {calibration && (
                <div
                  style={{
                    padding: "8px 16px",
                    background: "rgba(126, 217, 160, 0.1)",
                    border: "1px solid var(--pass)",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontFamily: "'Spectral', serif", fontSize: 13, color: "var(--pass)" }}>
                    📏 Calibrated True Inches: {calibration.pixelsPerInch.toFixed(1)} px/in
                  </span>
                </div>
              )}
              {auditTrail.length > 0 && (
                <div
                  style={{
                    padding: "8px 16px",
                    background: "rgba(233, 185, 73, 0.1)",
                    border: "1px solid var(--warn)",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontFamily: "'Spectral', serif", fontSize: 13, color: "var(--warn)" }}>
                    📝 {auditTrail.length} Reviewer Edits Logged (Audit Trail)
                  </span>
                </div>
              )}
              <div
                style={{
                  padding: "8px 16px",
                  background: "var(--forest-2)",
                  border: "1px solid var(--forest-3)",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--champagne-dim)" }}>
                  ⏱ {analysisMs > 0 ? `${(analysisMs / 1000).toFixed(1)}s` : "cached"}
                </span>
              </div>
            </div>

            <div className="card-dark" style={{ marginBottom: 24, border: "1px solid var(--forest-3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "baseline", marginBottom: 16 }}>
                <div>
                  <p className="section-label" style={{ marginBottom: 6 }}>AI Fabric Profile</p>
                  <h2 style={{ margin: 0, color: "var(--champagne)", fontFamily: "'Unbounded', sans-serif", fontSize: "1.15rem" }}>{fabricTypeGuess}</h2>
                </div>
                <span style={{ color: "var(--pass)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                  {Math.round(metadataConfidence * 100)}% profile confidence
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {[["Material", material], ["Color", fabricColor], ["Construction", weaveOrKnit], ["Finish", finish]].map(([label, value]) => (
                  <div key={label} style={{ padding: "12px 14px", background: "var(--forest)", borderRadius: 10 }}>
                    <div className="section-label" style={{ fontSize: 9, marginBottom: 5 }}>{label}</div>
                    <div style={{ color: "var(--champagne)", fontFamily: "'Spectral', serif", fontSize: 16 }}>{value || "Unknown"}</div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 24,
                marginBottom: 24,
              }}
            >
              {/* Annotated image */}
              <div className="card-dark">
                <p className="section-label" style={{ marginBottom: 16 }}>
                  (Result) Annotated image {calibration && "— True Inch Measured"}
                </p>
                <AnnotatedImage
                  imageDataUrl={imageDataUrl}
                  defects={defects}
                  selectedId={selectedDefectId}
                  onSelectDefect={setSelectedDefectId}
                  calibrationMode={calibrationMode}
                  onCalibrationSelected={handleCalibrationSelected}
                  calibration={calibration}
                />
                <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 12, height: 12, background: "var(--reject)", borderRadius: 2 }} />
                    <span style={{ fontSize: 12, color: "var(--champagne-dim)", fontFamily: "'Spectral', serif" }}>Major</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 12, height: 12, background: "var(--warn)", borderRadius: 2 }} />
                    <span style={{ fontSize: 12, color: "var(--champagne-dim)", fontFamily: "'Spectral', serif" }}>Minor</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 12, height: 12, background: "var(--champagne)", borderRadius: 2 }} />
                    <span style={{ fontSize: 12, color: "var(--champagne-dim)", fontFamily: "'Spectral', serif" }}>Hole</span>
                  </div>
                </div>
              </div>

              {/* Grade result */}
              <div className="card-dark">
                <p className="section-label" style={{ marginBottom: 24 }}>
                  (Result) Grade
                </p>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                  <GradeBadge grade={gradingResult.grade} size="xl" reason={gradingResult.gradeReason} />
                </div>

                {/* Score cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                    marginBottom: 24,
                  }}
                >
                  {[
                    { label: "Total Points", value: gradingResult.totalPoints.toFixed(0), unit: "pts" },
                    { label: "Density", value: gradingResult.pointsPer100SqYd.toFixed(1), unit: "pts/100" },
                    { label: "Defects", value: defects.length.toString(), unit: "" },
                  ].map(({ label, value, unit }) => (
                    <div
                      key={label}
                      style={{
                        background: "var(--forest)",
                        borderRadius: 12,
                        padding: "16px 12px",
                        textAlign: "center",
                        border: "1px solid var(--forest-3)",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Unbounded', sans-serif",
                          fontWeight: 800,
                          fontSize: 24,
                          color: "var(--champagne)",
                          lineHeight: 1,
                        }}
                      >
                        {value}
                        <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.6 }}>{unit}</span>
                      </div>
                      <div style={{ fontFamily: "'Spectral', serif", fontSize: 12, color: "var(--champagne-dim)", marginTop: 6, fontStyle: "italic" }}>
                        ({label})
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 24, padding: "12px 16px", background: "var(--forest)", borderRadius: 10, border: "1px solid var(--forest-3)" }}>
                  <span style={{ fontFamily: "'Spectral', serif", fontSize: 13, color: "var(--champagne-dim)" }}>
                    Standard: <strong style={{ color: "var(--champagne)" }}>{GRADING_STANDARDS_INFO[standard].name}</strong> · Threshold: <strong style={{ color: "var(--warn)", fontFamily: "'JetBrains Mono', monospace" }}>{agreedThreshold}</strong>
                  </span>
                </div>

                <button className="btn-primary" style={{ width: "100%", opacity: saving ? 0.65 : 1 }} disabled={saving} onClick={saveCertificate}>
                  <ImageIcon size={16} />
                  {saving ? "Signing Certificate…" : "Generate Certificate & Share Link"}
                </button>
              </div>
            </div>

            {/* Editable defect table */}
            <div className="card-dark" style={{ marginBottom: 24 }}>
              <p className="section-label" style={{ marginBottom: 16 }}>
                (Result) Defect table — reviewer can edit or delete
              </p>
              <DefectTable
                defects={scoredDefects}
                selectedId={selectedDefectId}
                onSelectDefect={setSelectedDefectId}
                onUpdateDefect={handleUpdateDefect}
                onDeleteDefect={handleDeleteDefect}
                editable
                theme="dark"
              />
            </div>

            {/* Audit Trail Log */}
            {auditTrail.length > 0 && (
              <div className="card-dark" style={{ borderLeft: "4px solid var(--warn)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <History size={18} color="var(--warn)" />
                  <p className="section-label" style={{ margin: 0, color: "var(--warn)" }}>
                    Reviewer Audit Trail ({auditTrail.length} Actions Logged & Fingerprinted)
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {auditTrail.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        background: "var(--forest)",
                        borderRadius: 6,
                        border: "1px solid var(--forest-3)",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontFamily: "'Spectral', serif", color: "var(--champagne)" }}>
                        {log.details}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--champagne-dim)" }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ fontFamily: "'Spectral', serif", fontStyle: "italic", fontSize: 12, color: "var(--champagne-dim)", marginTop: 12, margin: 0 }}>
                  (This human audit trail is included in the server-signed certificate payload and printed on the PDF certificate.)
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
