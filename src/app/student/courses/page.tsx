"use client";

import { useEffect, useState } from "react";
import CourseCard from "@/components/courses/CourseCard";
import { Course } from "@/lib/types";

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showJoin, setShowJoin] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCourses(data);
      })
      .catch(() => {});
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    setJoining(true);
    try {
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_code: classCode }),
      });
      if (res.ok) {
        const course = await res.json();
        setCourses((prev) => [course, ...prev]);
        setClassCode("");
        setShowJoin(false);
      } else {
        const err = await res.json();
        setJoinError(err.error ?? "Failed to join course");
      }
    } catch {
      setJoinError("Network error");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Courses</h1>
          <p className="text-sm text-muted mt-1">Select a course to start chatting with your TA.</p>
        </div>
        <button
          onClick={() => { setShowJoin(!showJoin); setJoinError(""); }}
          className="bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          {showJoin ? "Cancel" : "+ Join Course"}
        </button>
      </div>

      {showJoin && (
        <form
          onSubmit={handleJoin}
          className="bg-surface border border-border rounded-lg p-5 mb-6 space-y-3"
        >
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Class Code</label>
            <input
              className="border border-border rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-accent uppercase tracking-widest"
              placeholder="e.g. ABC123"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
          </div>
          {joinError && (
            <p className="text-sm text-red-500">{joinError}</p>
          )}
          <button
            type="submit"
            disabled={joining}
            className="bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {joining ? "Joining..." : "Join"}
          </button>
        </form>
      )}

      {courses.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-8 text-center">
          <p className="text-muted text-sm">No courses yet. Join one using a class code from your instructor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} basePath="/student/course" />
          ))}
        </div>
      )}
    </div>
  );
}
