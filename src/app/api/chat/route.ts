import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerClient } from "@/lib/supabaseServer";
import { buildSystemPrompt } from "@/lib/prompt";
import { isDisallowedRequest, checkTopicGate } from "@/lib/policy";
import { Course, BotConfig, Assignment, CourseMaterial, Message } from "@/lib/types";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });
}

export async function POST(req: NextRequest) {
  const { session_id, course_id, assignment_id, message } = await req.json();

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify user owns the session
  if (session_id) {
    const { data: session } = await supabase
      .from("sessions")
      .select("student_id")
      .eq("id", session_id)
      .single();
    if (!session || session.student_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Fetch student's concept check preference
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("concept_checks_enabled")
    .eq("id", user.id)
    .single();
  const conceptChecksEnabled = studentProfile?.concept_checks_enabled ?? true;

  // Fetch course
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", course_id)
    .single<Course>();

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Fetch bot config
  const { data: config } = await supabase
    .from("bot_configs")
    .select("*")
    .eq("course_id", course_id)
    .single<BotConfig>();

  if (!config) {
    return NextResponse.json({ error: "Bot config not found" }, { status: 404 });
  }

  // Fetch assignment if specified
  let assignment: Assignment | null = null;
  if (assignment_id) {
    const { data } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", assignment_id)
      .single<Assignment>();
    assignment = data;
  }

  // Fetch relevant materials
  let materials: CourseMaterial[] = [];
  if (assignment?.material_ids && assignment.material_ids.length > 0) {
    // Assignment-specific: only selected materials
    const { data: matData } = await supabase
      .from("course_materials")
      .select("*")
      .in("id", assignment.material_ids);
    materials = matData ?? [];
  } else {
    // General chat (no assignment or no materials selected): all course materials
    const { data: matData } = await supabase
      .from("course_materials")
      .select("*")
      .eq("course_id", course_id);
    materials = matData ?? [];
  }

  console.log("[chat] materials found:", materials.length, "with text:", materials.filter(m => m.extracted_text).length, materials.map(m => ({ name: m.file_name, textLen: m.extracted_text?.length ?? 0 })));

  // Merge assignment-level policy overrides into course-level policy
  const effectivePolicy = assignment?.overrides
    ? { ...config.policy, ...assignment.overrides }
    : config.policy;

  // Check policy — disallowed artifacts & topic gates
  // Return blocked responses as SSE so the client (which expects streaming) can display them
  let blockedMessage: string | null = null;

  const policyCheck = isDisallowedRequest(message, effectivePolicy);
  if (policyCheck.blocked) {
    blockedMessage = policyCheck.reason ?? effectivePolicy.refusal_message;
  }

  if (!blockedMessage && effectivePolicy.topic_gates && effectivePolicy.topic_gates.length > 0) {
    const lowerMessage = message.toLowerCase();
    for (const gate of effectivePolicy.topic_gates) {
      if (lowerMessage.includes(gate.topic.toLowerCase())) {
        const result = checkTopicGate(gate.topic, effectivePolicy.topic_gates);
        if (result.gated) {
          blockedMessage = result.gate?.message || effectivePolicy.refusal_message;
          break;
        }
      }
    }
  }

  if (blockedMessage) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: blockedMessage })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Fetch prior messages for context
  const { data: priorMessages } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", session_id)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  const effectiveConfig = {
    ...config,
    policy: effectivePolicy,
  };
  const systemPrompt = buildSystemPrompt(course, effectiveConfig, assignment, materials, conceptChecksEnabled);

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...(priorMessages ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // Stream response
  const stream = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: chatMessages,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
