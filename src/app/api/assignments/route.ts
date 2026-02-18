import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export async function DELETE(req: NextRequest) {
  const assignmentId = req.nextUrl.searchParams.get("id");
  if (!assignmentId) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify instructor owns the course this assignment belongs to
  const { data: assignment } = await supabase
    .from("assignments")
    .select("course_id")
    .eq("id", assignmentId)
    .single();

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: course } = await supabase
    .from("courses")
    .select("owner_id")
    .eq("id", assignment.course_id)
    .single();

  if (!course || course.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("course_id");
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabase.from("assignments").select("*").order("created_at", { ascending: false });
  if (courseId) query = query.eq("course_id", courseId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Verify instructor owns the course
  const { data: existing } = await supabase
    .from("assignments")
    .select("course_id")
    .eq("id", body.id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: course } = await supabase
    .from("courses")
    .select("owner_id")
    .eq("id", existing.course_id)
    .single();
  if (!course || course.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.staff_notes !== undefined) updates.staff_notes = body.staff_notes;
  if (body.due_date !== undefined) updates.due_date = body.due_date;
  if (body.overrides !== undefined) updates.overrides = body.overrides;
  if (body.material_ids !== undefined) updates.material_ids = body.material_ids;
  if (body.question_hints !== undefined) updates.question_hints = body.question_hints;
  if (body.anchor_material_id !== undefined) updates.anchor_material_id = body.anchor_material_id;
  if (body.annotations !== undefined) updates.annotations = body.annotations;

  const { data, error } = await supabase
    .from("assignments")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

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

  // Verify instructor role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "instructor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      course_id: body.course_id,
      title: body.title,
      prompt: body.prompt ?? "",
      staff_notes: body.staff_notes ?? "",
      faq: body.faq ?? [],
      due_date: body.due_date ?? null,
      overrides: body.overrides ?? null,
      material_ids: body.material_ids ?? [],
      question_hints: body.question_hints ?? [],
      anchor_material_id: body.anchor_material_id ?? null,
      annotations: body.annotations ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
