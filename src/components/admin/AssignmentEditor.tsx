"use client";

import { useEffect, useMemo, useState } from "react";
import { Assignment, CourseMaterial, PolicyConfig } from "@/lib/types";

export interface AssignmentPayload {
  title: string;
  staff_notes: string;
  due_date: string | null;
  overrides: Partial<PolicyConfig> | null;
  material_ids: string[];
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
    description: "No direct answers. Only confirms if the student is on the right track.",
  },
  {
    value: 3,
    label: "Guided",
    description: "Step-by-step hints that lead toward the answer without giving it away.",
  },
  {
    value: 5,
    label: "Full support",
    description: "Will explain everything, including worked examples, after enough effort.",
  },
];

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AssignmentEditor({ materials = [], existing, onSave, onCancel }: Props) {
  const isEdit = !!existing;

  const [title, setTitle] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [helpLevel, setHelpLevel] = useState(3);

  // Pre-fill when editing
  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setStaffNotes(existing.staff_notes || "");
      setSelectedMaterialIds(existing.material_ids || []);
      setDueDate(existing.due_date ? toLocalDatetime(existing.due_date) : "");
      setHelpLevel(existing.overrides?.hint_levels ?? 3);
    }
  }, [existing]);

  // Group materials by category
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
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      overrides,
      material_ids: selectedMaterialIds,
    });

    if (!isEdit) {
      setTitle("");
      setStaffNotes("");
      setSelectedMaterialIds([]);
      setDueDate("");
      setHelpLevel(3);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted block mb-1">Assignment Title</label>
        <input
          className="border border-border rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-accent bg-background"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* Due Date */}
      <div>
        <label className="text-xs font-medium text-muted block mb-1">Due Date</label>
        <input
          type="datetime-local"
          className="border border-border rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-accent bg-background"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <p className="text-[10px] text-muted mt-1">
          Times are in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
        </p>
      </div>

      {/* Materials selector grouped by category */}
      {materials.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted block mb-1">
            Relevant Materials <span className="text-muted/60">(select which materials apply)</span>
          </label>
          <div className="border border-border rounded-lg p-3 bg-background space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(materialsByCategory).map(([category, categoryMaterials]) => {
              const allSelected = categoryMaterials.every((m) => selectedMaterialIds.includes(m.id));
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
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
                  <div className="space-y-1">
                    {categoryMaterials.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedMaterialIds.includes(m.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMaterialIds([...selectedMaterialIds, m.id]);
                            } else {
                              setSelectedMaterialIds(selectedMaterialIds.filter((id) => id !== m.id));
                            }
                          }}
                          className="accent-accent"
                        />
                        {m.file_name}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <hr className="border-border" />

      {/* Guardrails & Policy */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Guardrails & Policy</h4>

        <div className="space-y-2">
          <p className="text-sm text-muted">How much help should the bot give?</p>
          {helpLevelOptions.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                helpLevel === opt.value
                  ? "bg-accent-light border border-accent"
                  : "hover:bg-background border border-transparent"
              }`}
            >
              <input
                type="radio"
                name="helpLevel"
                checked={helpLevel === opt.value}
                onChange={() => setHelpLevel(opt.value)}
                className="accent-accent mt-0.5"
              />
              <div>
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <p className="text-xs text-muted">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>

      </div>

      <hr className="border-border" />

      {/* Staff Notes */}
      <div>
        <label className="text-xs font-medium text-muted block mb-1">
          Staff Notes <span className="text-muted/60">(private, never shown to students)</span>
        </label>
        <p className="text-[10px] text-muted mb-2">
          Add any extra instructions or context for the bot. These shape how it responds but are never revealed to students.
        </p>
        <textarea
          className="border border-border rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-accent bg-background"
          rows={4}
          value={staffNotes}
          onChange={(e) => setStaffNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          {isEdit ? "Save Changes" : "Add Assignment"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
