 "use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AssignmentPayload } from "@/components/admin/AssignmentEditor";
import MaterialsPanel from "@/components/admin/MaterialsPanel";
import AssignmentEditor from "@/components/admin/AssignmentEditor";
import InsightsPanel from "@/components/admin/InsightsPanel";
import InstructorChatPanel from "@/components/admin/InstructorChatPanel";
import RosterPanel from "@/components/admin/RosterPanel";
import { Announcement, Assignment, BotConfig, CourseMaterial, UsageInsight } from "@/lib/types";

type Tab = "materials" | "assignments" | "announcements" | "roster" | "insights";

export default function AdminCoursePage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("assignments");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [insights, setInsights] = useState<UsageInsight | null>(null);
  const [classCode, setClassCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [posting, setPosting] = useState(false);
  const [insightsAssignment, setInsightsAssignment] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [generalChatEnabled, setGeneralChatEnabled] = useState(false);
  const [generalChatMaterialIds, setGeneralChatMaterialIds] = useState<string[]>([]);
  const [savingGeneralChat, setSavingGeneralChat] = useState(false);

  // Load course info (for class code)
  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((courses) => {
        if (!Array.isArray(courses)) return;
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
          setBotConfig(data);
          setGeneralChatEnabled(data.general_chat_enabled ?? false);
          setGeneralChatMaterialIds(data.general_chat_material_ids ?? []);
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

  // Load materials
  useEffect(() => {
    fetch(`/api/materials?course_id=${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMaterials(data);
      })
      .catch(() => {});
  }, [courseId]);

  // Load announcements when tab is active
  useEffect(() => {
    if (activeTab !== "announcements") return;
    fetch(`/api/announcements?course_id=${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAnnouncements(data);
      })
      .catch(() => {});
  }, [activeTab, courseId]);

  // Load insights when tab is active or assignment filter changes
  useEffect(() => {
    if (activeTab !== "insights") return;
    const params = new URLSearchParams({ course_id: courseId });
    if (insightsAssignment) params.set("assignment_id", insightsAssignment);
    fetch(`/api/insights?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.course_id) setInsights(data);
      })
      .catch(() => {});
  }, [activeTab, courseId, insightsAssignment]);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    setPosting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, content: newAnnouncement }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements((prev) => [data, ...prev]);
        setNewAnnouncement("");
      }
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const res = await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
    if (res.ok) setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "materials", label: "Materials" },
    { key: "assignments", label: "Assignments" },
    { key: "announcements", label: "Announcements" },
    { key: "roster", label: "Roster" },
    { key: "insights", label: "Insights" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Course Configuration</h1>
          <p className="text-sm text-muted mt-1">Configure Pascal&apos;s behavior and policies.</p>
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
        <a
          href={`/student/course/${courseId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-border text-sm font-medium rounded-lg text-foreground hover:bg-surface transition-colors"
        >
          See Student View
        </a>
      </div>

      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "insights" ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-surface border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <label className="text-xs font-medium text-muted">Filter insights by:</label>
              <select
                value={insightsAssignment ?? ""}
                onChange={(e) => {
                  setInsightsAssignment(e.target.value || null);
                  setInsights(null);
                }}
                className="border border-border rounded px-3 py-1.5 text-sm bg-background focus:outline-none focus:border-accent"
              >
                <option value="">All Assignments</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
            <InsightsPanel insights={insights} />
          </div>
          <div className="lg:col-span-2 lg:sticky lg:top-4 lg:self-start">
            <InstructorChatPanel courseId={courseId} />
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg p-6">
          {activeTab === "materials" && (
            <MaterialsPanel
              courseId={courseId}
              materials={materials}
              onMaterialsChange={setMaterials}
            />
          )}
          {activeTab === "assignments" && (
            <div className="space-y-6">
              {/* ── General Chat Config ── */}
              <div className="p-4 bg-background border border-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">General Chat</h3>
                    <p className="text-[11px] text-muted mt-0.5">
                      When enabled, students can chat without selecting an assignment. Only the materials you choose below will be available.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalChatEnabled}
                      onChange={(e) => setGeneralChatEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>
                {generalChatEnabled && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted block">
                      Materials available in general chat:
                    </label>
                    <div className="border border-border rounded-lg bg-surface divide-y divide-border max-h-40 overflow-y-auto">
                      {materials.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent-light/30">
                          <input
                            type="checkbox"
                            checked={generalChatMaterialIds.includes(m.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGeneralChatMaterialIds((prev) => [...prev, m.id]);
                              } else {
                                setGeneralChatMaterialIds((prev) => prev.filter((id) => id !== m.id));
                              }
                            }}
                            className="accent-accent"
                          />
                          <span className="truncate text-foreground">{m.file_name}</span>
                          <span className="text-[10px] text-muted ml-auto shrink-0">{m.category}</span>
                        </label>
                      ))}
                      {materials.length === 0 && (
                        <p className="px-3 py-2 text-xs text-muted">Upload materials first in the Materials tab.</p>
                      )}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  disabled={savingGeneralChat}
                  onClick={async () => {
                    setSavingGeneralChat(true);
                    try {
                      const res = await fetch("/api/bot-config", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          course_id: courseId,
                          general_chat_enabled: generalChatEnabled,
                          general_chat_material_ids: generalChatEnabled ? generalChatMaterialIds : [],
                        }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setBotConfig(data);
                      }
                    } finally {
                      setSavingGeneralChat(false);
                    }
                  }}
                  className="bg-accent text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {savingGeneralChat ? "Saving..." : "Save General Chat Settings"}
                </button>
              </div>

              <hr className="border-border" />

              {assignments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Existing Assignments</h3>
                  {assignments.map((a) =>
                    editingId === a.id ? (
                      <div key={a.id} className="p-4 bg-background border border-accent/40 rounded-lg">
                        <h4 className="text-sm font-medium text-foreground mb-3">Editing: {a.title}</h4>
                        <AssignmentEditor
                          materials={materials}
                          existing={a}
                          onSave={async (payload: AssignmentPayload) => {
                            const res = await fetch("/api/assignments", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: a.id, ...payload }),
                            });
                            if (!res.ok) {
                              const err = await res.json().catch(() => ({}));
                              alert(`Failed to update assignment: ${err.error || "Unknown error"}`);
                              return;
                            }
                            const updated = await res.json();
                            setAssignments((prev) => prev.map((x) => (x.id === a.id ? updated : x)));
                            setEditingId(null);
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    ) : (
                      <div
                        key={a.id}
                        className="p-4 bg-background border border-border rounded-lg hover:border-accent/40 transition-colors cursor-pointer"
                        onClick={() => setEditingId(a.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="font-medium text-foreground">{a.title}</span>
                            {a.due_date && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-accent-light text-accent">
                                Due {new Date(a.due_date).toLocaleString()}
                              </span>
                            )}
                            <div className="flex gap-3 mt-1.5 text-[11px] text-muted">
                              <span>
                                {a.overrides?.hint_levels === 1
                                  ? "Strict"
                                  : a.overrides?.hint_levels === 5
                                    ? "Full support"
                                    : "Guided"}
                              </span>
                              {a.material_ids?.length > 0 && (
                                <span>{a.material_ids.length} material{a.material_ids.length !== 1 ? "s" : ""}</span>
                              )}
                              {a.staff_notes && <span>Has staff notes</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-accent">Edit</span>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm(`Delete "${a.title}"?`)) return;
                                const res = await fetch(`/api/assignments?id=${a.id}`, { method: "DELETE" });
                                if (res.ok) setAssignments((prev) => prev.filter((x) => x.id !== a.id));
                              }}
                              className="text-xs text-muted hover:text-red-500 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                  <hr className="border-border" />
                </div>
              )}
              {showNewForm ? (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">New Assignment</h3>
                  <AssignmentEditor
                    materials={materials}
                    onSave={async (a: AssignmentPayload) => {
                      const res = await fetch("/api/assignments", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ...a, course_id: courseId }),
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        alert(`Failed to create assignment: ${err.error || "Unknown error"}`);
                        return;
                      }
                      const created = await res.json();
                      setAssignments((prev) => [created, ...prev]);
                      setShowNewForm(false);
                    }}
                    onCancel={() => setShowNewForm(false)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowNewForm(true)}
                  className="w-full py-3 border-2 border-dashed border-border rounded-lg text-sm font-medium text-muted hover:border-accent/50 hover:text-foreground transition-colors"
                >
                  + New Assignment
                </button>
              )}
            </div>
          )}
          {activeTab === "announcements" && (
            <div className="space-y-6">
              <form onSubmit={handlePostAnnouncement} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">New Announcement</label>
                  <textarea
                    className="border border-border rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-accent bg-background"
                    rows={3}
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="Write an announcement for your students..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={posting}
                  className="bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {posting ? "Posting..." : "Post Announcement"}
                </button>
              </form>

              {announcements.length > 0 && (
                <div className="space-y-3">
                  <hr className="border-border" />
                  {announcements.map((a) => (
                    <div key={a.id} className="p-4 bg-background border border-border rounded-lg">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{a.content}</p>
                        <button
                          onClick={() => handleDeleteAnnouncement(a.id)}
                          className="text-xs text-muted hover:text-red-500 transition-colors shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted">
                        <span>{new Date(a.created_at).toLocaleString()}</span>
                        {a.view_count !== undefined && (
                          <span>{a.view_count}/{a.total_students} viewed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === "roster" && <RosterPanel courseId={courseId} />}
        </div>
      )}
    </div>
  );
}
