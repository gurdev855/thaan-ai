import React, { useState } from "react";
import type { Defect, ScoredDefect } from "../engine/grading";
import { DEFECT_TYPE_LABELS, DEFECT_TYPES } from "../config/grading";
import { Trash2, Edit3 } from "lucide-react";

interface DefectTableProps {
  defects: ScoredDefect[];
  selectedId?: string | null;
  onSelectDefect?: (id: string) => void;
  onUpdateDefect?: (id: string, updates: Partial<Pick<Defect, "type" | "severity">>) => void;
  onDeleteDefect?: (id: string) => void;
  editable?: boolean;
  theme?: "dark" | "light";
}

export function DefectTable({
  defects,
  selectedId,
  onSelectDefect,
  onUpdateDefect,
  onDeleteDefect,
  editable = true,
  theme = "dark",
}: DefectTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const tableClass = theme === "dark" ? "defect-table" : "defect-table-light";
  const textColor = theme === "dark" ? "var(--champagne)" : "var(--ink)";
  const dimColor = theme === "dark" ? "var(--champagne-dim)" : "var(--ink-dim)";

  if (defects.length === 0) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: dimColor,
          fontFamily: "'Spectral', serif",
          fontStyle: "italic",
        }}
      >
        No defects detected — fabric appears clear.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={tableClass}>
        <thead>
          <tr>
            <th>#</th>
            <th>Type</th>
            <th>Severity</th>
            <th>Size (in)</th>
            <th>Points</th>
            <th>Confidence</th>
            <th>Note</th>
            {editable && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {defects.map((d, i) => {
            const isSelected = d.id === selectedId;
            const isEditing = editingId === d.id;
            const severityColor = d.severity === "major" ? "var(--reject)" : "var(--warn)";
            const pointsColor = d.points > 0 ? "var(--warn)" : "var(--champagne-dim)";

            return (
              <tr
                key={d.id}
                onClick={() => onSelectDefect?.(d.id)}
                style={{
                  cursor: onSelectDefect ? "pointer" : "default",
                  outline: isSelected ? "2px solid var(--champagne)" : "none",
                  outlineOffset: -2,
                }}
              >
                <td>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      fontWeight: 500,
                      color: dimColor,
                    }}
                  >
                    {i + 1}
                  </span>
                </td>
                <td>
                  {isEditing && editable ? (
                    <select
                      className="select-dark"
                      value={d.type}
                      style={{ fontSize: 13, padding: "4px 8px", minWidth: 140 }}
                      onChange={(e) => {
                        onUpdateDefect?.(d.id, { type: e.target.value as Defect["type"] });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {DEFECT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {DEFECT_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: textColor }}>{DEFECT_TYPE_LABELS[d.type]}</span>
                  )}
                </td>
                <td>
                  {isEditing && editable ? (
                    <select
                      className="select-dark"
                      value={d.severity}
                      style={{ fontSize: 13, padding: "4px 8px" }}
                      onChange={(e) => {
                        onUpdateDefect?.(d.id, { severity: e.target.value as Defect["severity"] });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                    </select>
                  ) : (
                    <span
                      style={{
                        fontFamily: "'Unbounded', sans-serif",
                        fontSize: 10,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: severityColor,
                        background: `${severityColor}18`,
                        borderRadius: 4,
                        padding: "2px 8px",
                      }}
                    >
                      {d.severity}
                    </span>
                  )}
                </td>
                <td>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      color: textColor,
                    }}
                  >
                    {d.sizeIn.toFixed(2)}"
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 14,
                      fontWeight: 500,
                      color: d.points > 0 ? pointsColor : dimColor,
                    }}
                  >
                    {d.points}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: dimColor,
                    }}
                  >
                    {(d.confidence * 100).toFixed(0)}%
                  </span>
                </td>
                <td>
                  <span style={{ color: dimColor, fontSize: 13, fontStyle: "italic" }}>
                    {d.note || "—"}
                  </span>
                </td>
                {editable && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: "4px 10px" }}
                        title="Edit defect"
                        aria-label={`Edit defect ${i + 1}`}
                        onClick={() => setEditingId(isEditing ? null : d.id)}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        className="btn-reject"
                        style={{ padding: "4px 10px" }}
                        title="Delete false detection"
                        aria-label={`Delete defect ${i + 1}`}
                        onClick={() => onDeleteDefect?.(d.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 12, padding: "0 4px" }}>
        <span
          style={{
            fontFamily: "'Spectral', serif",
            fontStyle: "italic",
            fontSize: 13,
            color: dimColor,
          }}
        >
          (Click a row to highlight on image. Edit or delete false detections — grade recalculates live.)
        </span>
      </div>
    </div>
  );
}
