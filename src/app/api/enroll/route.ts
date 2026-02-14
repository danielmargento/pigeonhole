import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const { class_code } = await req.json();
  if (!class_code || typeof class_code !== "string") {
    return NextResponse.json({ error: "class_code is required" }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Look up course by class code
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .eq("class_code", class_code.trim().toUpperCase())
    .single();

  if (courseError || !course) {
    return NextResponse.json({ error: "Invalid class code" }, { status: 404 });
  }

  // Insert enrollment (unique constraint handles duplicates)
  const { error: enrollError } = await supabase
    .from("enrollments")
    .insert({ course_id: course.id, student_id: user.id });

  if (enrollError) {
    if (enrollError.code === "23505") {
      return NextResponse.json({ error: "Already enrolled in this course" }, { status: 409 });
    }
    return NextResponse.json({ error: enrollError.message }, { status: 500 });
  }

  return NextResponse.json(course, { status: 201 });
}
