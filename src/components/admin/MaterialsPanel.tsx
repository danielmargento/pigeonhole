"use client";

import { useState, useRef } from "react";
import { CourseMaterial } from "@/lib/types";

const CATEGORIES = [
  { value: "lecture_slides", label: "Lecture Slides" },
  { value: "problem_set", label: "Problem Set" },
  { value: "practice_test", label: "Practice Test" },
  { value: "syllabus", label: "Syllabus" },
  { value: "other", label: "Other" },
];

const ACCEPTED_TYPES = ".pdf,.txt,.md";

interface Props {
  courseId: string;
  materials: CourseMaterial[];
  onMaterialsChange: (materials: CourseMaterial[]) => void;
}

export default function MaterialsPanel({ courseId, materials, onMaterialsChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("other");
  const [dragOver, setDragOver] = useState(false);
  const [reextracting, setReextracting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReextract = async (materialId: string) => {
    setReextracting(materialId);
    try {
      const res = await fetch("/api/materials/reextract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material_id: materialId }),
      });
      if (res.ok) {
        const results = await res.json();
        const result = results[0];
        if (result?.status === "success" && result.text_length > 0) {
          // Refresh materials list to get updated extracted_text
          const matRes = await fetch(`/api/materials?course_id=${courseId}`);
          if (matRes.ok) {
            const updated = await matRes.json();
            if (Array.isArray(updated)) onMaterialsChange(updated);
          }
        } else {
          setError(`Re-extraction failed for this file: ${result?.error || "no text extracted"}`);
        }
      }
    } catch {
      setError("Re-extraction failed");
    } finally {
      setReextracting(null);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("course_id", courseId);
        formData.append("category", category);

        const res = await fetch("/api/materials", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const material = await res.json();
          onMaterialsChange([material, ...materials]);
          materials = [material, ...materials];
        } else {
          const body = await res.json().catch(() => null);
          setError(`Upload failed for "${file.name}": ${body?.error ?? res.statusText}`);
          break;
        }
      }
    } catch (e) {
      setError(`Upload error: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/materials?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      onMaterialsChange(materials.filter((m) => m.id !== id));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Course Materials</h3>
        <p className="text-xs text-muted mb-4">
          Upload lecture slides, problem sets, practice tests, and other materials. Pascal will use the content of these files to help students.
        </p>

        <div className="flex gap-3 mb-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:border-accent"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-accent bg-accent/5"
              : "border-border hover:border-accent/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
          />
          {uploading ? (
            <p className="text-sm text-muted">Uploading...</p>
          ) : (
            <>
              <p className="text-sm text-foreground font-medium">
                Drop files here or click to upload
              </p>
              <p className="text-xs text-muted mt-1">
                PDF, TXT, MD
              </p>
            </>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>

      {materials.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Uploaded Materials ({materials.length})
          </h3>
          {materials.map((m) => {
            const hasText = !!(m.extracted_text && m.extracted_text.length > 0);
            return (
              <div key={m.id} className="p-3 bg-background border border-border rounded flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">{m.file_name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-light text-accent">
                      {CATEGORIES.find((c) => c.value === m.category)?.label ?? m.category}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(m.created_at).toLocaleDateString()}
                    </span>
                    {hasText ? (
                      <span className="text-[10px] text-green-600">Parsed</span>
                    ) : (
                      <span className="text-[10px] text-red-500">No text extracted</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!hasText && (
                    <button
                      onClick={() => handleReextract(m.id)}
                      disabled={reextracting === m.id}
                      className="text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
                    >
                      {reextracting === m.id ? "Extracting..." : "Re-extract"}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-xs text-muted hover:text-red-500 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
