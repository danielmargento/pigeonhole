"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PolicyEditor from "@/components/admin/PolicyEditor";
import StylePresetSelect from "@/components/admin/StylePresetSelect";
import ContextUploader from "@/components/admin/ContextUploader";
import AssignmentEditor from "@/components/admin/AssignmentEditor";
import PreviewPanel from "@/components/admin/PreviewPanel";
import InsightsPanel from "@/components/admin/InsightsPanel";
import { Assignment, PolicyConfig, StylePreset, UsageInsight } from "@/lib/types";
import { defaultPolicy } from "@/config/defaultPolicy";

type Tab = "policy" | "context" | "assignments" | "preview" | "insights";

export default function AdminCoursePage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("policy");
  const [policy, setPolicy] = useState<PolicyConfig>(defaultPolicy);
  const [stylePreset, setStylePreset] = useState<StylePreset>("socratic");
  const [context, setContext] = useState("");
  const [saving, setSaving] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [insights, setInsights] = useState<UsageInsight | null>(null);
  const [classCode, setClassCode] = useState("");

  // Load course info (for class code)
  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((courses) => {
        const course = courses.find((c: { id: string }) => c.id === courseId);
        if (course) setClassCode(course.class_code ?? "");
      })
      .catch(() => {});
  }, [courseId]);

  // Load bot config on mount
  useEffect(() => {
    fetch(`/api/bot-config?course_id=${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.course_id) {
          setPolicy(data.policy ?? defaultPolicy);
          setStylePreset(data.style_preset ?? "socratic");
          setContext(data.context ?? "");
        }
      })
      .catch(() => {});
  }, [courseId]);

  // Load assignments
  useEffect(() => {
    fetch(`/api/assignments?course_id=${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAssignments(data);
      })
      .catch(() => {});
  }, [courseId]);

  // Load insights when tab is active
  useEffect(() => {
    if (activeTab !== "insights") return;
    fetch(`/api/insights?course_id=${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.course_id) setInsights(data);
      })
      .catch(() => {});
  }, [activeTab, courseId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/bot-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          style_preset: stylePreset,
          policy,
          context,
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "policy", label: "Policy" },
    { key: "context", label: "Context" },
    { key: "assignments", label: "Assignments" },
    { key: "preview", label: "Preview" },
    { key: "insights", label: "Insights" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Course Configuration</h1>
          <p className="text-sm text-muted mt-1">Configure your TA bot&apos;s behavior and policies.</p>
          {classCode && (
            <p className="text-sm text-muted mt-1">
              Join code:{" "}
              <button
                onClick={() => navigator.clipboard.writeText(classCode)}
                className="font-mono font-semibold text-foreground hover:text-accent transition-colors cursor-pointer"
                title="Click to copy"
              >
                {classCode}
              </button>
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-lg p-6">
        {activeTab === "policy" && (
          <div className="space-y-6">
            <StylePresetSelect value={stylePreset} onChange={setStylePreset} />
            <hr className="border-border" />
            <PolicyEditor policy={policy} onChange={setPolicy} />
          </div>
        )}
        {activeTab === "context" && (
          <ContextUploader context={context} onChange={setContext} />
        )}
        {activeTab === "assignments" && (
          <div className="space-y-6">
            {assignments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Existing Assignments</h3>
                {assignments.map((a) => (
                  <div key={a.id} className="p-3 bg-background border border-border rounded text-sm">
                    <span className="font-medium text-foreground">{a.title}</span>
                    <p className="text-muted text-xs mt-0.5">{a.prompt.slice(0, 100)}{a.prompt.length > 100 ? "..." : ""}</p>
                  </div>
                ))}
                <hr className="border-border" />
              </div>
            )}
            <AssignmentEditor
              onSave={(a) => {
                fetch("/api/assignments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...a, course_id: courseId }),
                }).then(() => {
                  // Refresh assignments list
                  fetch(`/api/assignments?course_id=${courseId}`)
                    .then((r) => r.json())
                    .then((data) => {
                      if (Array.isArray(data)) setAssignments(data);
                    });
                });
              }}
            />
          </div>
        )}
        {activeTab === "preview" && <PreviewPanel courseId={courseId} />}
        {activeTab === "insights" && <InsightsPanel insights={insights} />}
      </div>
    </div>
  );
}
