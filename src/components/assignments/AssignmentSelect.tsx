"use client";

import { Assignment } from "@/lib/types";

interface Props {
  assignments: Assignment[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  generalChatEnabled?: boolean;
}

export default function AssignmentSelect({ assignments, selected, onSelect, generalChatEnabled = true }: Props) {
  const hasOptions = assignments.length > 0 || generalChatEnabled;

  if (!hasOptions) {
    return (
      <span className="text-sm text-muted px-3 py-1.5">
        No assignments available yet
      </span>
    );
  }

  return (
    <select
      className="border border-border rounded px-3 py-1.5 text-sm bg-surface focus:outline-none focus:border-accent"
      value={selected ?? ""}
      onChange={(e) => onSelect(e.target.value || null)}
    >
      {generalChatEnabled && <option value="">General</option>}
      {assignments.map((a) => (
        <option key={a.id} value={a.id}>
          {a.title}
        </option>
      ))}
    </select>
  );
}
