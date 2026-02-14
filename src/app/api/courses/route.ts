import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { defaultPolicy } from "@/config/defaultPolicy";

function generateClassCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "instructor") {
    // Instructors see only their own courses
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    // Students see only enrolled courses
    const { data, error } = await supabase
      .from("enrollments")
      .select("course_id, courses(*)")
      .eq("student_id", user.id)
      .order("enrolled_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const courses = (data ?? []).map((e) => e.courses).filter(Boolean);
    return NextResponse.json(courses);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("courses")
    .insert({
      name: body.name,
      code: body.code,
      description: body.description,
      owner_id: user.id,
      class_code: generateClassCode(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create default bot config for the new course
  await supabase.from("bot_configs").insert({
    course_id: data.id,
    style_preset: "socratic",
    policy: defaultPolicy,
    context: "",
  });

  return NextResponse.json(data, { status: 201 });
}
