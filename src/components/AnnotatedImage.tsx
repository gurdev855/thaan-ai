import React, { useRef, useEffect, useState } from "react";
import type { Defect, CalibrationData } from "../engine/grading";

interface AnnotatedImageProps {
  imageDataUrl: string;
  defects: Defect[];
  selectedId?: string | null;
  onSelectDefect?: (id: string) => void;
  calibrationMode?: boolean;
  onCalibrationSelected?: (p1: { x: number; y: number }, p2: { x: number; y: number }, pixelDist: number) => void;
  calibration?: CalibrationData | null;
}

function getBBoxColor(defect: Defect): { stroke: string; fill: string; textBg: string; text: string } {
  if (defect.type === "hole") {
    return { stroke: "#F7E7CE", fill: "rgba(247,231,206,0.15)", textBg: "#F7E7CE", text: "#102C26" };
  }
  if (defect.severity === "major") {
    return { stroke: "#E8615A", fill: "rgba(232,97,90,0.12)", textBg: "#E8615A", text: "white" };
  }
  return { stroke: "#E9B949", fill: "rgba(233,185,73,0.12)", textBg: "#E9B949", text: "#102C26" };
}

export function AnnotatedImage({
  imageDataUrl,
  defects,
  selectedId,
  onSelectDefect,
  calibrationMode = false,
  onCalibrationSelected,
  calibration,
}: AnnotatedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [calibPoint1, setCalibPoint1] = useState<{ x: number; y: number } | null>(null);
  const [calibPoint2, setCalibPoint2] = useState<{ x: number; y: number } | null>(null);

  const [imgEl] = useState(() => {
    const img = new Image();
    return img;
  });

  useEffect(() => {
    imgEl.onload = () => setImgLoaded(true);
    imgEl.src = imageDataUrl;
    return () => {
      imgEl.onload = null;
    };
  }, [imageDataUrl, imgEl]);

  // Reset temp points when calibration mode switches
  useEffect(() => {
    if (!calibrationMode) {
      setCalibPoint1(null);
      setCalibPoint2(null);
    }
  }, [calibrationMode]);

  useEffect(() => {
    if (!imgLoaded || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    ctx.drawImage(imgEl, 0, 0);

    const W = canvas.width;
    const H = canvas.height;

    // 1. Draw defects bounding boxes
    defects.forEach((d, i) => {
      const x = d.bbox.x * W;
      const y = d.bbox.y * H;
      const w = d.bbox.w * W;
      const h = d.bbox.h * H;

      const colors = getBBoxColor(d);
      const isSelected = d.id === selectedId;
      const strokeWidth = isSelected ? 3 : 2;

      // Outer dark stroke for visibility on any fabric
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = strokeWidth + 2;
      ctx.strokeRect(x, y, w, h);

      // Main colored stroke
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = strokeWidth;
      ctx.strokeRect(x, y, w, h);

      // Fill
      ctx.fillStyle = colors.fill;
      ctx.fillRect(x, y, w, h);

      // Label number
      const label = String(i + 1);
      const fontSize = Math.max(12, Math.min(24, W * 0.018));
      const padding = 4;
      ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
      const textW = ctx.measureText(label).width + padding * 2;
      const textH = fontSize + padding * 2;

      // Label background
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(x, y, textW + 2, textH + 2);
      ctx.fillStyle = colors.textBg;
      ctx.fillRect(x + 1, y + 1, textW, textH);

      // Label text
      ctx.fillStyle = colors.text;
      ctx.fillText(label, x + 1 + padding, y + 1 + padding + fontSize * 0.8);
    });

    // 2. Draw Calibration line if saved OR in active calibration
    const p1 = calibPoint1 || calibration?.p1;
    const p2 = calibPoint2 || calibration?.p2;

    if (p1) {
      const x1 = p1.x * W;
      const y1 = p1.y * H;
      // Draw point 1 target
      ctx.strokeStyle = "#7ED9A0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x1, y1, 8, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = "rgba(126, 217, 160, 0.4)";
      ctx.fill();

      if (p2) {
        const x2 = p2.x * W;
        const y2 = p2.y * H;

        // Draw connecting line
        ctx.beginPath();
        ctx.strokeStyle = "#7ED9A0";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw point 2 target
        ctx.beginPath();
        ctx.arc(x2, y2, 8, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fillStyle = "rgba(126, 217, 160, 0.4)";
        ctx.fill();

        // Measurement tag
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const tagText = calibration
          ? `Scale: ${calibration.realLengthIn}" (${calibration.pixelsPerInch.toFixed(1)} px/in)`
          : "Calibrating distance";

        ctx.font = "bold 13px 'JetBrains Mono', monospace";
        const tagW = ctx.measureText(tagText).width + 12;
        ctx.fillStyle = "rgba(16, 44, 38, 0.9)";
        ctx.fillRect(midX - tagW / 2, midY - 14, tagW, 22);
        ctx.strokeStyle = "#7ED9A0";
        ctx.strokeRect(midX - tagW / 2, midY - 14, tagW, 22);
        ctx.fillStyle = "#7ED9A0";
        ctx.fillText(tagText, midX - tagW / 2 + 6, midY + 2);
      }
    }
  }, [imgLoaded, defects, selectedId, imgEl, calibPoint1, calibPoint2, calibration, calibrationMode]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const W = canvas.width;
    const H = canvas.height;

    // If calibration mode is active, handle point tapping
    if (calibrationMode) {
      const normPoint = { x: cx / W, y: cy / H };
      if (!calibPoint1) {
        setCalibPoint1(normPoint);
      } else if (!calibPoint2) {
        setCalibPoint2(normPoint);
        const dx = (normPoint.x - calibPoint1.x) * W;
        const dy = (normPoint.y - calibPoint1.y) * H;
        const pixelDist = Math.sqrt(dx * dx + dy * dy);
        onCalibrationSelected?.(calibPoint1, normPoint, pixelDist);
      } else {
        // Reset and set point 1
        setCalibPoint1(normPoint);
        setCalibPoint2(null);
      }
      return;
    }

    // Normal mode: select defect
    if (!onSelectDefect) return;
    for (let i = defects.length - 1; i >= 0; i--) {
      const d = defects[i];
      const x = d.bbox.x * W;
      const y = d.bbox.y * H;
      const w = d.bbox.w * W;
      const h = d.bbox.h * H;
      if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) {
        onSelectDefect(d.id);
        return;
      }
    }
  };

  const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!calibrationMode || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    const point = { x: 0.5, y: calibPoint1 ? 0.5 : 0.5 };
    if (!calibPoint1) {
      setCalibPoint1(point);
    } else if (!calibPoint2) {
      const secondPoint = { x: 0.75, y: 0.5 };
      setCalibPoint2(secondPoint);
      onCalibrationSelected?.(calibPoint1, secondPoint, canvasRef.current?.width ? canvasRef.current.width * 0.25 : 1);
    }
  };

  return (
    <div style={{ position: "relative", background: "#000", borderRadius: 16, overflow: "hidden" }}>
      {calibrationMode && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            zIndex: 10,
            padding: "8px 14px",
            background: "rgba(16, 44, 38, 0.95)",
            border: "1px solid var(--pass)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontFamily: "'Spectral', serif", fontSize: 13, color: "var(--pass)" }}>
            {!calibPoint1
              ? "Tap Point 1 on ruler / reference edge"
              : !calibPoint2
              ? "Tap Point 2 on ruler / reference edge"
              : "Reference points set! Enter real length below."}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--champagne)" }}>
            {calibPoint1 && calibPoint2 ? "✓ 2/2 Points" : calibPoint1 ? "1/2 Points" : "0/2 Points"}
          </span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onKeyDown={handleCanvasKeyDown}
        tabIndex={0}
        role="img"
        aria-label={calibrationMode ? "Fabric image. Press Enter or Space to place calibration points at the center." : "Annotated fabric inspection image. Click a defect box to select it."}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          cursor: calibrationMode ? "crosshair" : onSelectDefect ? "pointer" : "default",
        }}
      />
      {!imgLoaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--forest-2)",
          }}
        >
          <span style={{ color: "var(--champagne-dim)", fontFamily: "'Spectral', serif" }}>
            Loading image…
          </span>
        </div>
      )}
    </div>
  );
}

// ---- Scanning animation overlay during analysis ----
export function ScanningImage({ imageDataUrl }: { imageDataUrl: string }) {
  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden" }}>
      <img
        src={imageDataUrl}
        alt="Analyzing fabric"
        style={{ width: "100%", height: "auto", display: "block", opacity: 0.7 }}
      />
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <div className="scan-line" />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(16,44,38,0.5)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "3px solid var(--forest-3)",
              borderTopColor: "var(--pass)",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ color: "var(--champagne)", fontFamily: "'Spectral', serif", fontSize: 15, margin: 0 }}>
            Analyzing with AI…
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
