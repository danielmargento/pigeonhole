"use client";

import { useState } from "react";
import { PolicyConfig } from "@/lib/types";

interface Props {
  onSave: (assignment: {
    title: string;
    prompt: string;
    staff_notes: string;
    faq: string[];
    overrides: Partial<PolicyConfig> | null;
  }) => void;
}

export default function AssignmentEditor({ onSave }: Props) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [faq, setFaq] = useState("");
  const [showOverrides, setShowOverrides] = useState(false);

  // Override toggles — undefined means "use course default"
  const [allowFinalAnswers, setAllowFinalAnswers] = useState<boolean | undefined>(undefined);
  const [allowFullCode, setAllowFullCode] = useState<boolean | undefined>(undefined);
  const [requireAttemptFirst, setRequireAttemptFirst] = useState<boolean | undefined>(undefined);
  const [hintLevels, setHintLevels] = useState<number | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const overrides: Partial<PolicyConfig> = {};
    if (allowFinalAnswers !== undefined) overrides.allow_final_answers = allowFinalAnswers;
    if (allowFullCode !== undefined) overrides.allow_full_code = allowFullCode;
    if (requireAttemptFirst !== undefined) overrides.require_attempt_first = requireAttemptFirst;
    if (hintLevels !== undefined) overrides.hint_levels = hintLevels;

    onSave({
      title,
      prompt,
      staff_notes: staffNotes,
      faq: faq.split("\n").map((l) => l.trim()).filter(Boolean),
      overrides: Object.keys(overrides).length > 0 ? overrides : null,
    });
    setTitle("");
    setPrompt("");
    setStaffNotes("");
    setFaq("");
    setShowOverrides(false);
    setAllowFinalAnswers(undefined);
    setAllowFullCode(undefined);
    setRequireAttemptFirst(undefined);
    setHintLevels(undefined);
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
      <div>
        <label className="text-xs font-medium text-muted block mb-1">Prompt</label>
        <textarea
          className="border border-border rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-accent bg-background"
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted block mb-1">
          Staff Notes <span className="text-muted/60">(hidden from students)</span>
        </label>
        <textarea
          className="border border-border rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-accent bg-background"
          rows={3}
          value={staffNotes}
          onChange={(e) => setStaffNotes(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted block mb-1">FAQ (one per line)</label>
        <textarea
          className="border border-border rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-accent bg-background"
          rows={3}
          value={faq}
          onChange={(e) => setFaq(e.target.value)}
        />
      </div>

      {/* Per-assignment policy overrides */}
      <div>
        <button
          type="button"
          onClick={() => setShowOverrides(!showOverrides)}
          className="text-xs text-accent hover:underline"
        >
          {showOverrides ? "Hide" : "Show"} policy overrides for this assignment
        </button>
      </div>

      {showOverrides && (
        <div className="border border-border rounded-lg p-4 bg-background space-y-3">
          <p className="text-xs text-muted">
            Override course-level defaults for this assignment. Leave unchecked to use course defaults.
          </p>
          <TriStateToggle
            label="Allow final answers"
            value={allowFinalAnswers}
            onChange={setAllowFinalAnswers}
          />
          <TriStateToggle
            label="Allow full code solutions"
            value={allowFullCode}
            onChange={setAllowFullCode}
          />
          <TriStateToggle
            label="Require student attempt first"
            value={requireAttemptFirst}
            onChange={setRequireAttemptFirst}
          />
          <div>
            <label className="text-xs text-muted block mb-1">
              Hint levels override
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hintLevels !== undefined}
                onChange={(e) => setHintLevels(e.target.checked ? 3 : undefined)}
                className="accent-accent"
              />
              {hintLevels !== undefined ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={hintLevels}
                    onChange={(e) => setHintLevels(parseInt(e.target.value))}
                    className="flex-1 accent-accent"
                  />
                  <span className="text-xs text-foreground font-medium w-4">{hintLevels}</span>
                </div>
              ) : (
                <span className="text-xs text-muted">Using course default</span>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-accent-hover transition-colors"
      >
        Add Assignment
      </button>
    </form>
  );
}

function TriStateToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={value !== undefined}
        onChange={(e) => onChange(e.target.checked ? false : undefined)}
        className="accent-accent"
      />
      {value !== undefined ? (
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-accent"
          />
          {label}
        </label>
      ) : (
        <span className="text-xs text-muted">{label} — using course default</span>
      )}
    </div>
  );
}
