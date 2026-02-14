"use client";

import { useState } from "react";
import Link from "next/link";
import { Course } from "@/lib/types";

interface Props {
  course: Course;
  basePath: string;
  showClassCode?: boolean;
  onDelete?: (id: string) => void;
}

export default function CourseCard({ course, basePath, showClassCode, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  return (
    <div className="relative bg-surface border border-border rounded-lg p-5 hover:border-accent/40 hover:shadow-sm transition-all group">
      <Link href={`${basePath}/${course.id}`} className="block">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-accent bg-accent-light px-2 py-0.5 rounded">
              {course.code}
            </span>
            <h3 className="font-semibold text-foreground mt-2 group-hover:text-accent transition-colors">
              {course.name}
            </h3>
          </div>
          <span className="text-muted text-lg">&rarr;</span>
        </div>
        {course.description && (
          <p className="text-sm text-muted mt-2 line-clamp-2">{course.description}</p>
        )}
        {showClassCode && course.class_code && (
          <p className="text-xs text-muted mt-3">
            Join code: <span className="font-mono font-semibold text-foreground">{course.class_code}</span>
          </p>
        )}
      </Link>

      {onDelete && !confirming && (
        <button
          onClick={(e) => {
            e.preventDefault();
            setConfirming(true);
          }}
          className="absolute top-3 right-3 text-muted hover:text-red-500 text-xs transition-colors opacity-0 group-hover:opacity-100"
        >
          Delete
        </button>
      )}

      {confirming && (
        <div className="mt-3 pt-3 border-t border-border" onClick={(e) => e.preventDefault()}>
          <p className="text-xs text-muted mb-2">
            Type <span className="font-semibold text-foreground">{course.name}</span> to confirm deletion:
          </p>
          <div className="flex gap-2">
            <input
              className="border border-border rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:border-red-400 bg-background"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={course.name}
              autoFocus
            />
            <button
              onClick={() => {
                if (confirmText === course.name) onDelete?.(course.id);
              }}
              disabled={confirmText !== course.name}
              className="px-2 py-1 text-xs rounded bg-red-500 text-white disabled:opacity-30 transition-opacity"
            >
              Delete
            </button>
            <button
              onClick={() => { setConfirming(false); setConfirmText(""); }}
              className="px-2 py-1 text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
