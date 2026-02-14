"use client";

import { useEffect, useState } from "react";
import CourseCard from "@/components/courses/CourseCard";
import { Course } from "@/lib/types";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then(setCourses)
      .catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code, description }),
    });
    if (res.ok) {
      const course = await res.json();
      setCourses((prev) => [course, ...prev]);
      setName("");
      setCode("");
      setDescription("");
      setShowForm(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Courses</h1>
          <p className="text-sm text-muted mt-1">Manage your courses and TA configurations.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          {showForm ? "Cancel" : "+ New Course"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-surface border border-border rounded-lg p-5 mb-6 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Course Code</label>
              <input
                className="border border-border rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-accent"
                placeholder="CS101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Course Name</label>
              <input
                className="border border-border rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-accent"
                placeholder="Intro to Computer Science"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Description</label>
            <textarea
              className="border border-border rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-accent"
              placeholder="Brief course description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <button
            type="submit"
            className="bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            Create Course
          </button>
        </form>
      )}

      {courses.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-8 text-center">
          <p className="text-muted text-sm">No courses yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} basePath="/admin/course" showClassCode />
          ))}
        </div>
      )}
    </div>
  );
}
