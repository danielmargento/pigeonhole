import OpenAI from "openai";
import { UsageInsight, Session, Message, Assignment, LLMInsightSummary } from "./types";
import { SupabaseClient } from "@supabase/supabase-js";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });
}

/**
 * Generate LLM-powered insight summaries from student messages.
 * Results are cached in course_insights_cache for 1 hour.
 * When assignmentId is provided, insights are scoped to that assignment.
 */
export async function generateLLMInsights(
  supabase: SupabaseClient,
  courseId: string,
  userMessages: Message[],
  assignmentId?: string | null
): Promise<LLMInsightSummary | null> {
  // Check cache first — match on course + assignment
  let cacheQuery = supabase
    .from("course_insights_cache")
    .select("insights, generated_at")
    .eq("course_id", courseId);

  if (assignmentId) {
    cacheQuery = cacheQuery.eq("assignment_id", assignmentId);
  } else {
    cacheQuery = cacheQuery.is("assignment_id", null);
  }

  const { data: cached } = await cacheQuery.single();

  if (cached) {
    const age = Date.now() - new Date(cached.generated_at).getTime();
    if (age < 60 * 60 * 1000) {
      return cached.insights as LLMInsightSummary;
    }
  }

  if (userMessages.length === 0) return null;

  // Sample up to 200 recent user messages
  const sampled = userMessages
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 200);

  const messagesText = sampled
    .map((m, i) => `${i + 1}. ${m.content}`)
    .join("\n");

  const scopeNote = assignmentId
    ? "These are student questions for a SPECIFIC assignment. Focus your analysis on patterns within this assignment's context."
    : "These are student questions across all assignments in the course.";

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an educational analytics assistant. Analyze these student questions sent to Pascal, a course AI assistant. Identify patterns across ALL messages — do not focus on individual students.

${scopeNote}

Return a JSON object with exactly this structure:
{
  "top_topics": [
    {"topic": "Topic Name", "count": 42}
  ],
  "misconceptions": [
    {
      "topic": "short topic name",
      "description": "what students get wrong",
      "sample_questions": ["actual student question 1", "actual student question 2"]
    }
  ]
}

Rules:
- top_topics: exactly 5 items — the most discussed conceptual topics across all messages. Only include real academic concepts (e.g. "Recursion", "Big-O Notation", "Linked Lists"). EXCLUDE generic references like "homework question 2", "problem 3", "assignment help", etc. "count" is your estimate of how many messages relate to that topic.
- misconceptions: max 5 items — concepts students commonly misunderstand. For each, include 1-3 REAL sample questions from the messages. Each sample question must be substantive and DISTINCT from the others — do NOT include two questions that ask essentially the same thing. Pick questions that show different angles of the misconception.
- Be specific and actionable — a teacher should be able to use these to adjust their teaching
- Return ONLY valid JSON, no markdown fences`,
      },
      {
        role: "user",
        content: `Here are ${sampled.length} recent student messages:\n\n${messagesText}`,
      },
    ],
    temperature: 0.3,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  let summary: LLMInsightSummary;
  try {
    const parsed = JSON.parse(raw);
    summary = {
      top_topics: parsed.top_topics ?? [],
      misconceptions: parsed.misconceptions ?? [],
      generated_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }

  // Upsert cache
  const cacheRow: Record<string, unknown> = {
    course_id: courseId,
    assignment_id: assignmentId ?? null,
    insights: summary,
    generated_at: new Date().toISOString(),
  };

  // Use raw SQL-style upsert since we have a functional unique index
  if (cached) {
    // Update existing row
    let updateQuery = supabase
      .from("course_insights_cache")
      .update({ insights: summary, generated_at: new Date().toISOString() })
      .eq("course_id", courseId);

    if (assignmentId) {
      updateQuery = updateQuery.eq("assignment_id", assignmentId);
    } else {
      updateQuery = updateQuery.is("assignment_id", null);
    }
    await updateQuery;
  } else {
    // Insert new row
    await supabase.from("course_insights_cache").insert(cacheRow);
  }

  return summary;
}

export function aggregateInsights(
  courseId: string,
  sessions: Session[],
  assignments: Assignment[]
): UsageInsight {
  // Build assignment → unique student set
  const assignmentUsers = new Map<string, Set<string>>();
  for (const s of sessions) {
    if (s.assignment_id) {
      if (!assignmentUsers.has(s.assignment_id)) assignmentUsers.set(s.assignment_id, new Set());
      assignmentUsers.get(s.assignment_id)!.add(s.student_id);
    }
  }

  const assignmentMap = new Map(assignments.map((a) => [a.id, a.title]));
  const users_per_assignment = Array.from(assignmentUsers.entries())
    .map(([assignment_id, users]) => ({
      assignment_id,
      title: assignmentMap.get(assignment_id) ?? "Unknown",
      unique_users: users.size,
    }))
    .sort((a, b) => b.unique_users - a.unique_users)
    .slice(0, 10);

  return {
    course_id: courseId,
    users_per_assignment,
  };
}
