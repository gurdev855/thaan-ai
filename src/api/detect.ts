// ============================================================
// DETECT API CLIENT — calls /api/detect and handles caching
// ============================================================
import type { Defect } from "../engine/grading";
import { sha256Base64 } from "../utils/crypto";
import { DEMO_RESULTS } from "./demoData";

export interface DetectionResult {
  fabric_type_guess: string;
  material: string;
  color: string;
  weave_or_knit: string;
  finish: string;
  metadata_confidence: number;
  image_quality: "good" | "poor";
  defects: Defect[];
  source: "ai" | "fallback";
}

export interface DetectResponse {
  result: DetectionResult;
  fromCache: boolean;
  fromDemo: boolean;
  durationMs: number;
}

// In-memory cache: imageHash → result
const memCache = new Map<string, DetectionResult>();

/**
 * Deterministically generates defects for an uploaded image based on its SHA-256 hash.
 * This guarantees the exact same image always gives the identical result even offline.
 */
function generateDeterministicDefects(hash: string): DetectionResult {
  let seed = 0;
  for (let i = 0; i < hash.length; i++) {
    seed = (seed * 31 + hash.charCodeAt(i)) >>> 0;
  }
  const rand = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  const types: Defect["type"][] = [
    "stain",
    "slub",
    "broken_end",
    "thick_yarn",
    "thin_place",
    "float",
  ];

  const defects: Defect[] = [
    {
      id: "d1",
      type: types[Math.floor(rand(1) * types.length)],
      severity: rand(2) > 0.4 ? "major" : "minor",
      bbox: {
        x: Math.round((0.15 + rand(3) * 0.25) * 100) / 100,
        y: Math.round((0.20 + rand(4) * 0.30) * 100) / 100,
        w: Math.round((0.08 + rand(5) * 0.12) * 100) / 100,
        h: Math.round((0.06 + rand(6) * 0.10) * 100) / 100,
      },
      confidence: Math.round((0.85 + rand(7) * 0.12) * 100) / 100,
      note: "Yarn irregularity in weave structure",
    },
    {
      id: "d2",
      type: types[Math.floor(rand(8) * types.length)],
      severity: rand(9) > 0.5 ? "major" : "minor",
      bbox: {
        x: Math.round((0.52 + rand(10) * 0.25) * 100) / 100,
        y: Math.round((0.45 + rand(11) * 0.25) * 100) / 100,
        w: Math.round((0.06 + rand(12) * 0.10) * 100) / 100,
        h: Math.round((0.08 + rand(13) * 0.14) * 100) / 100,
      },
      confidence: Math.round((0.78 + rand(14) * 0.18) * 100) / 100,
      note: "Slight pick density variation",
    },
  ];

  return {
    fabric_type_guess: "Cotton / Poly Blend Woven Fabric",
    material: "Cotton / polyester blend",
    color: "Neutral grey",
    weave_or_knit: "Plain weave",
    finish: "Unfinished / natural hand",
    metadata_confidence: 0.78,
    image_quality: "good",
    defects,
    source: "fallback",
  };
}

export async function detectDefects(
  imageBase64: string,
  sampleId?: string,
  demoMode = false
): Promise<DetectResponse> {
  const t0 = Date.now();

  // Hash the image for caching
  const hash = await sha256Base64(imageBase64);

  // Check memory cache first
  const cacheKey = `${hash}:${demoMode ? "demo" : "live"}`;
  if (memCache.has(cacheKey)) {
    const cached = memCache.get(cacheKey)!;
    return {
      result: cached,
      fromCache: true,
      fromDemo: cached.source === "fallback",
      durationMs: Date.now() - t0,
    };
  }

  // Demo mode: Return pre-baked sample or deterministic simulated AI result
  if (demoMode) {
    let result: DetectionResult;
    if (sampleId && DEMO_RESULTS[sampleId]) {
      result = DEMO_RESULTS[sampleId];
    } else {
      result = generateDeterministicDefects(hash);
    }
    memCache.set(cacheKey, result);
    return {
      result,
      fromCache: false,
      fromDemo: true,
      durationMs: Date.now() - t0,
    };
  }

  // Try calling backend API
  try {
    const raw = await callDetectEndpoint(imageBase64, hash);
    memCache.set(cacheKey, raw);
    return {
      result: raw,
      fromCache: false,
      fromDemo: raw.source === "fallback",
      durationMs: Date.now() - t0,
    };
  } catch (err) {
    console.warn("Backend API unavailable, using offline fallback:", err);
    // Fallback: If backend is offline or no API key, use demo or deterministic fallback
    let result: DetectionResult;
    if (sampleId && DEMO_RESULTS[sampleId]) {
      result = DEMO_RESULTS[sampleId];
    } else {
      result = generateDeterministicDefects(hash);
    }
    memCache.set(cacheKey, result);
    return {
      result,
      fromCache: false,
      fromDemo: true,
      durationMs: Date.now() - t0,
    };
  }
}

async function callDetectEndpoint(
  imageBase64: string,
  imageHash: string
): Promise<DetectionResult> {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "";
  const resp = await fetch(`${apiBase}/api/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, imageHash }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Detection API error ${resp.status}: ${body}`);
  }

  const raw = (await resp.json()) as Partial<DetectionResult>;
  return {
    fabric_type_guess: raw.fabric_type_guess || "Unknown fabric",
    material: raw.material || "Unknown",
    color: raw.color || "Unknown",
    weave_or_knit: raw.weave_or_knit || "Unknown",
    finish: raw.finish || "Unknown",
    metadata_confidence: Math.max(0, Math.min(1, Number(raw.metadata_confidence) || 0)),
    image_quality: raw.image_quality === "poor" ? "poor" : "good",
    defects: Array.isArray(raw.defects) ? raw.defects : [],
    source: raw.source === "ai" ? "ai" : "fallback",
  };
}
