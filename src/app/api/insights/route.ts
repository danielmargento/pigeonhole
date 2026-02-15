import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { aggregateInsights, generateLLMInsights } from "@/lib/analytics";
import { Session, Message, Assignment } from "@/lib/types";

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("course_id");
  const assignmentId = req.nextUrl.searchParams.get("assignment_id");
  if (!courseId) {
    return NextResponse.json({ error: "course_id is required" }, { status: 400 });
  }

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

  // Fetch all sessions for this course (needed for users_per_assignment)
  const { data: allSessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("course_id", courseId)
    .returns<Session[]>();

  // Fetch assignments for this course
  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("course_id", courseId)
    .returns<Assignment[]>();

  // Users per assignment is always course-wide
  const insights = aggregateInsights(courseId, allSessions ?? [], assignments ?? []);

  // For LLM insights, filter to specific assignment if provided
  const filteredSessions = assignmentId
    ? (allSessions ?? []).filter((s) => s.assignment_id === assignmentId)
    : (allSessions ?? []);

  const filteredSessionIds = filteredSessions.map((s) => s.id);

  let messages: Message[] = [];
  if (filteredSessionIds.length > 0) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .in("session_id", filteredSessionIds)
      .returns<Message[]>();
    messages = data ?? [];
  }

  // Generate LLM insights from user messages (scoped to assignment if selected)
  const userMessages = messages.filter((m) => m.role === "user");
  const llmSummary = await generateLLMInsights(supabase, courseId, userMessages, assignmentId);
  insights.llm_summary = llmSummary;

  return NextResponse.json(insights);
}
