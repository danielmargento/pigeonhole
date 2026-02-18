"use client";

import { useEffect, useMemo, useState } from "react";
import { Assignment, CourseMaterial, PdfAnnotation, PolicyConfig } from "@/lib/types";
import PdfAnnotator from "./PdfAnnotator";

export interface AssignmentPayload {
  title: string;
  staff_notes: string;
  due_date: string | null;
  overrides: Partial<PolicyConfig> | null;
  material_ids: string[];
  anchor_material_id: string | null;
  annotations: PdfAnnotation[];
}

interface Props {
  materials?: CourseMaterial[];
  existing?: Assignment | null;
  onSave: (assignment: AssignmentPayload) => void;
  onCancel?: () => void;
}

const helpLevelOptions = [
  {
    value: 1,
    label: "Strict",
    description: "Confirms right/wrong only. No hints or guidance.",
  },
  {
    value: 3,
    label: "Guided",
    description: "Socratic method. Guiding questions and incremental hints.",
  },
  {
    value: 5,
    label: "Full support",
    description: "Complete tutoring with worked solutions after effort.",
  },
];

function toLocalDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toLocalTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineDatetime(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "23:59"}`;
}

export default function AssignmentEditor({ materials = [], existing, onSave, onCancel }: Props) {
  const isEdit = !!existing;

  const [title, setTitle] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("23:59");
  const [helpLevel, setHelpLevel] = useState(3);
  const [anchorMaterialId, setAnchorMaterialId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [annotatingMaterialId, setAnnotatingMaterialId] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setStaffNotes(existing.staff_notes || "");
      setSelectedMaterialIds(existing.material_ids || []);
      setAnchorMaterialId(existing.anchor_material_id ?? null);
      setDueDate(existing.due_date ? toLocalDate(existing.due_date) : "");
      setDueTime(existing.due_date ? toLocalTime(existing.due_date) : "23:59");
      setHelpLevel(existing.overrides?.hint_levels ?? 3);
      setAnnotations(existing.annotations || []);
    }
  }, [existing]);

  const materialsByCategory = useMemo(() => {
    const groups: Record<string, CourseMaterial[]> = {};
    for (const m of materials) {
      const cat = m.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    }
    return groups;
  }, [materials]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const allowAnswers = helpLevel === 5;
    const overrides: Partial<PolicyConfig> = {
      allow_final_answers: allowAnswers,
      allow_full_code: allowAnswers,
      require_attempt_first: helpLevel < 5,
      hint_levels: helpLevel,
    };

    onSave({
      title,
      staff_notes: staffNotes,
      due_date: dueDate ? new Date(combineDatetime(dueDate, dueTime)).toISOString() : null,
      overrides,
      material_ids: selectedMaterialIds,
      anchor_material_id: anchorMaterialId,
      annotations,
    });

    if (!isEdit) {
      setTitle("");
      setStaffNotes("");
      setSelectedMaterialIds([]);
      setDueDate("");
      setDueTime("23:59");
      setHelpLevel(3);
      setAnchorMaterialId(null);
      setAnnotations([]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Basics ── */}
      <div>
        <label className="text-xs font-medium text-muted block mb-1.5">Title</label>
        <input
          className="border border-border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-background transition-shadow"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Problem Set 3"
          required
        />
      </div>

      {/* ── Due Date ── */}
      <div>
        <label className="text-xs font-medium text-muted block mb-1.5">Due Date</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-background transition-shadow"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {dueDate && (
            <>
              <span className="text-xs text-muted">at</span>
              <input
                type="time"
                className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-background transition-shadow"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
              <button
                type="button"
                onClick={() => { setDueDate(""); setDueTime("23:59"); }}
                className="text-xs text-muted hover:text-red-500 transition-colors ml-1"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Help Level ── */}
      <div>
        <label className="text-xs font-medium text-muted block mb-2">How much help should the bot give?</label>
        <div className="grid grid-cols-3 gap-2">
          {helpLevelOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setHelpLevel(opt.value)}
              className={`relative p-3 rounded-lg text-left transition-all ${
                helpLevel === opt.value
                  ? "bg-accent-light border-2 border-accent shadow-sm"
                  : "bg-background border border-border hover:border-accent/40"
              }`}
            >
              <span className="text-sm font-semibold text-foreground block">{opt.label}</span>
              <span className="text-[11px] text-muted leading-tight block mt-0.5">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Materials ── */}
      {materials.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted block mb-2">
            Materials
          </label>
          <div className="border border-border rounded-lg bg-background divide-y divide-border max-h-56 overflow-y-auto">
            {Object.entries(materialsByCategory).map(([category, categoryMaterials]) => {
              const allSelected = categoryMaterials.every((m) => selectedMaterialIds.includes(m.id));
              return (
                <div key={category} className="px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                      {category}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (allSelected) {
                          setSelectedMaterialIds(
                            selectedMaterialIds.filter((id) => !categoryMaterials.some((m) => m.id === id))
                          );
                        } else {
                          const newIds = new Set([...selectedMaterialIds, ...categoryMaterials.map((m) => m.id)]);
                          setSelectedMaterialIds([...newIds]);
                        }
                      }}
                      className="text-[10px] text-accent hover:underline"
                    >
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {categoryMaterials.map((m) => {
                      const isSelected = selectedMaterialIds.includes(m.id);
                      const isAnchor = anchorMaterialId === m.id;
                      const isPdf = m.file_type === "pdf";
                      const annCount = annotations.filter((a) => a.material_id === m.id).length;
                      return (
                        <div
                          key={m.id}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                            isAnchor ? "bg-amber-50 border border-amber-200" : isSelected ? "bg-accent-light/50" : "hover:bg-accent-light/30"
                          }`}
                        >
                          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMaterialIds([...selectedMaterialIds, m.id]);
                                } else {
                                  setSelectedMaterialIds(selectedMaterialIds.filter((id) => id !== m.id));
                                  if (isAnchor) setAnchorMaterialId(null);
                                }
                              }}
                              className="accent-accent"
                            />
                            <span className="truncate">{m.file_name}</span>
                            {isAnchor && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold shrink-0">
                                Anchor
                              </span>
                            )}
                          </label>
                          {isSelected && (
                            <button
                              type="button"
                              title={isAnchor ? "This is the anchor document" : "Set as anchor document"}
                              onClick={() => {
                                setAnchorMaterialId(isAnchor ? null : m.id);
                              }}
                              className={`text-sm shrink-0 transition-colors ${
                                isAnchor ? "text-amber-500" : "text-gray-300 hover:text-amber-400"
                              }`}
                            >
                              &#9733;
                            </button>
                          )}
                          {isSelected && isPdf && (
                            <button
                              type="button"
                              onClick={() => setAnnotatingMaterialId(m.id)}
                              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors shrink-0 ${
                                annCount > 0
                                  ? "bg-accent text-white"
                                  : "bg-border text-muted hover:bg-accent hover:text-white"
                              }`}
                            >
                              {annCount > 0 ? `${annCount} annotation${annCount !== 1 ? "s" : ""}` : "Annotate"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Staff Notes ── */}
      <div>
        <label className="text-xs font-medium text-muted block mb-1.5">
          Staff Notes
        </label>
        <p className="text-[10px] text-muted mb-2">
          Private instructions for the bot. Never shown to students.
        </p>
        <textarea
          className="border border-border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-background transition-shadow"
          rows={3}
          value={staffNotes}
          onChange={(e) => setStaffNotes(e.target.value)}
          placeholder="e.g. Remind students about the chain rule on Q3..."
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm"
        >
          {isEdit ? "Save Changes" : "Create Assignment"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* PdfAnnotator modal */}
      {annotatingMaterialId && (
        <PdfAnnotator
          materialId={annotatingMaterialId}
          materialName={
            materials.find((m) => m.id === annotatingMaterialId)?.file_name ?? "PDF"
          }
          annotations={annotations}
          onAnnotationsChange={setAnnotations}
          onClose={() => setAnnotatingMaterialId(null)}
        />
      )}
    </form>
  );
}
