"use client";

import Link from "next/link";
import { Course } from "@/lib/types";

interface Props {
  course: Course;
  basePath: string;
  showClassCode?: boolean;
}

export default function CourseCard({ course, basePath, showClassCode }: Props) {
  return (
    <Link
      href={`${basePath}/${course.id}`}
      className="block bg-surface border border-border rounded-lg p-5 hover:border-accent/40 hover:shadow-sm transition-all group"
    >
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
  );
}
