import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerClient } from "@/lib/supabaseServer";
import { buildSystemPrompt, buildSystemPromptWithChunks } from "@/lib/prompt";
import { isDisallowedRequest, checkTopicGate } from "@/lib/policy";
import { generateQueryEmbedding } from "@/lib/embeddings";
import { Course, BotConfig, Assignment, CourseMaterial, Message, PdfAnnotation, RetrievedChunk } from "@/lib/types";

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

  // General chat gating: when no assignment selected, check if general chat is enabled
  if (!assignment) {
    if (!config.general_chat_enabled) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: "General chat is not enabled for this course. Please select an assignment from the dropdown above." })}\n\n`));
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
  } else if (!assignment && config.general_chat_enabled && config.general_chat_material_ids?.length > 0) {
    // General chat: only selected general chat materials
    const { data: matData } = await supabase
      .from("course_materials")
      .select("*")
      .in("id", config.general_chat_material_ids);
    materials = matData ?? [];
  } else {
    // Fallback: no materials
    materials = [];
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

  // Match question-specific hints against the student's message
  const matchedHints = (assignment?.question_hints ?? []).filter((h) => {
    const label = h.question.toLowerCase();
    const msg = message.toLowerCase();
    // Match "Q3", "question 3", "problem 3", etc.
    if (msg.includes(label)) return true;
    // Also try matching with common prefixes stripped
    const num = label.replace(/^(q|question|problem|prob)\s*/i, "").trim();
    if (num && (
      msg.includes(`q${num}`) || msg.includes(`q ${num}`) ||
      msg.includes(`question ${num}`) ||
      msg.includes(`problem ${num}`) ||
      msg.includes(`prob ${num}`)
    )) return true;
    return false;
  });

  if (matchedHints.length > 0) {
    console.log("[chat] Matched question hints:", matchedHints.map((h) => h.question));
  }

  // Annotations will be matched after RAG retrieval
  const allAnnotations: PdfAnnotation[] = assignment?.annotations ?? [];

  // Determine anchor material id
  const anchorMaterialId = assignment?.anchor_material_id ?? null;

  // Try RAG vector search, fall back to full-text injection
  let systemPrompt: string;
  let retrievedChunks: RetrievedChunk[] = [];
  try {
    const queryEmbedding = await generateQueryEmbedding(message);
    const materialIds = assignment?.material_ids?.length
      ? assignment.material_ids
      : (!assignment && config.general_chat_material_ids?.length > 0)
        ? config.general_chat_material_ids
        : null;
    const { data: chunks, error: rpcError } = await supabase.rpc("match_chunks", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.3,
      match_count: 8,
      p_course_id: course_id,
      p_material_ids: materialIds,
    });

    if (rpcError) throw rpcError;

    if (chunks && chunks.length > 0) {
      retrievedChunks = chunks as RetrievedChunk[];

      // Anchor doc boosting: boost similarity for chunks from anchor document
      if (anchorMaterialId) {
        retrievedChunks = retrievedChunks.map((c) =>
          c.material_id === anchorMaterialId
            ? { ...c, similarity: Math.min(c.similarity + 0.15, 1.0) }
            : c
        );
        retrievedChunks.sort((a, b) => b.similarity - a.similarity);

        // If no anchor chunks in results, do a secondary targeted search
        const hasAnchorChunks = retrievedChunks.some((c) => c.material_id === anchorMaterialId);
        if (!hasAnchorChunks) {
          const { data: anchorChunks } = await supabase.rpc("match_chunks", {
            query_embedding: JSON.stringify(queryEmbedding),
            match_threshold: 0.15,
            match_count: 3,
            p_course_id: course_id,
            p_material_ids: [anchorMaterialId],
          });
          if (anchorChunks && anchorChunks.length > 0) {
            retrievedChunks = [...(anchorChunks as RetrievedChunk[]), ...retrievedChunks];
            console.log("[chat] RAG: added", anchorChunks.length, "anchor doc chunks via secondary search");
          }
        }
      }

      console.log("[chat] RAG: retrieved", retrievedChunks.length, "chunks");

      // Match annotations against retrieved chunks by material_id + page
      const matchedAnnotations = allAnnotations.filter((a) =>
        retrievedChunks.some((c) =>
          c.material_id === a.material_id &&
          c.source_label.toLowerCase().includes(`page ${a.page}`)
        )
      );
      if (matchedAnnotations.length > 0) {
        console.log("[chat] Matched annotations:", matchedAnnotations.length);
      }

      systemPrompt = buildSystemPromptWithChunks(
        course,
        effectiveConfig,
        retrievedChunks,
        assignment,
        conceptChecksEnabled,
        matchedHints,
        matchedAnnotations,
        anchorMaterialId
      );
    } else {
      console.log("[chat] RAG: no chunks matched, falling back to full text");
      systemPrompt = buildSystemPrompt(course, effectiveConfig, assignment, materials, conceptChecksEnabled, matchedHints, undefined, anchorMaterialId);
    }
  } catch (ragError) {
    console.error("[chat] RAG search failed, falling back to full text:", ragError);
    systemPrompt = buildSystemPrompt(course, effectiveConfig, assignment, materials, conceptChecksEnabled, matchedHints, undefined, anchorMaterialId);
  }

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
      // Emit retrieved sources metadata before DONE
      if (retrievedChunks.length > 0) {
        const sources = retrievedChunks.map((c) => ({
          material_id: c.material_id,
          file_name: c.file_name,
          source_label: c.source_label,
          similarity: c.similarity,
        }));
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`)
        );
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
