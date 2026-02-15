 "use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import MaterialsPanel from "@/components/admin/MaterialsPanel";
import AssignmentEditor from "@/components/admin/AssignmentEditor";
import InsightsPanel from "@/components/admin/InsightsPanel";
import RosterPanel from "@/components/admin/RosterPanel";
import { Announcement, Assignment, CourseMaterial, UsageInsight } from "@/lib/types";

type Tab = "materials" | "assignments" | "announcements" | "roster" | "insights";

export default function AdminCoursePage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("assignments");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [insights, setInsights] = useState<UsageInsight | null>(null);
  const [classCode, setClassCode] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [posting, setPosting] = useState(false);

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

  // Load bot config on mount (still needed as fallback for general chat)
  useEffect(() => {
    fetch(`/api/bot-config?course_id=${courseId}`).catch(() => {});
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
            {assignments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Existing Assignments</h3>
                {assignments.map((a) => (
                  <div key={a.id} className="p-3 bg-background border border-border rounded text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">{a.title}</span>
                        {a.due_date && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-accent-light text-accent">
                            Due {new Date(a.due_date).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete "${a.title}"?`)) return;
                          const res = await fetch(`/api/assignments?id=${a.id}`, { method: "DELETE" });
                          if (res.ok) setAssignments((prev) => prev.filter((x) => x.id !== a.id));
                        }}
                        className="text-xs text-muted hover:text-red-500 transition-colors shrink-0"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                <hr className="border-border" />
              </div>
            )}
            <AssignmentEditor
              materials={materials}
              onSave={(a) => {
                fetch("/api/assignments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...a, course_id: courseId }),
                }).then(() => {
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
        {activeTab === "insights" && <InsightsPanel insights={insights} />}
      </div>
    </div>
  );
}
