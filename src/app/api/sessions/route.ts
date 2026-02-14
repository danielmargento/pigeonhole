import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("course_id");
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from("sessions")
    .select("*")
    .eq("student_id", user.id)
    .order("updated_at", { ascending: false });
  if (courseId) query = query.eq("course_id", courseId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Validate student is enrolled in the course
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("course_id", body.course_id)
    .eq("student_id", user.id)
    .single();

  if (!enrollment) {
    // Also allow course owners (instructors) to create sessions
    const { data: course } = await supabase
      .from("courses")
      .select("owner_id")
      .eq("id", body.course_id)
      .single();

    if (!course || course.owner_id !== user.id) {
      return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      course_id: body.course_id,
      assignment_id: body.assignment_id ?? null,
      student_id: user.id,
      title: body.title ?? "New Session",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify user owns the session
  const { data: session } = await supabase
    .from("sessions")
    .select("student_id")
    .eq("id", body.session_id)
    .single();
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("sessions")
    .update({ title: body.title, updated_at: new Date().toISOString() })
    .eq("id", body.session_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
