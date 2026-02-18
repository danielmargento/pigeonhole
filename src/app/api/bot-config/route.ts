import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("course_id");
  if (!courseId) {
    return NextResponse.json({ error: "course_id is required" }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("bot_configs")
    .select("*")
    .eq("course_id", courseId)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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

  const upsertData: Record<string, unknown> = {
    course_id: body.course_id,
  };
  if (body.style_preset !== undefined) upsertData.style_preset = body.style_preset;
  if (body.policy !== undefined) upsertData.policy = body.policy;
  if (body.context !== undefined) upsertData.context = body.context;
  if (body.general_chat_enabled !== undefined) upsertData.general_chat_enabled = body.general_chat_enabled;
  if (body.general_chat_material_ids !== undefined) upsertData.general_chat_material_ids = body.general_chat_material_ids;

  const { data, error } = await supabase
    .from("bot_configs")
    .upsert(upsertData, { onConflict: "course_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 200 });
}
