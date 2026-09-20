// ============================================================
// LOCAL STORAGE HISTORY
// ============================================================
import type {
  GradingResult,
  CalibrationData,
  AuditEvent,
} from "../engine/grading";
import type { DetectionResult } from "../api/detect";
import type { GradingStandard } from "../config/grading";

export interface BuyerSignOff {
  status: "accepted" | "disputed";
  timestamp: number;
  buyerName: string;
  notes: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  rollId: string;
  imageHash: string;
  imageDataUrl: string;
  fabricWidthIn: number;
  material?: string;
  color?: string;
  weaveOrKnit?: string;
  finish?: string;
  agreedThreshold: number;
  standard?: GradingStandard;
  calibration?: CalibrationData | null;
  auditTrail?: AuditEvent[];
  buyerSignOff?: BuyerSignOff | null;
  detection: DetectionResult;
  grading: GradingResult;
  fingerprint: string;
  shareId?: string;
  signingPayload?: Record<string, unknown>;
  source: "ai" | "fallback";
}

const HISTORY_KEY = "thaan_history_v1";
const MAX_ENTRIES = 20;

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry: HistoryEntry): void {
  const history = getHistory();
  const existingIdx = history.findIndex((e) => e.id === entry.id || e.rollId === entry.rollId);
  if (existingIdx >= 0) {
    history[existingIdx] = entry;
  } else {
    history.unshift(entry);
  }
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function updateBuyerSignOff(rollId: string, signOff: BuyerSignOff): boolean {
  const history = getHistory();
  const entry = history.find((e) => e.rollId === rollId);
  if (entry) {
    entry.buyerSignOff = signOff;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return true;
  }
  return false;
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return getHistory().find((e) => e.id === id || e.rollId === id);
}
