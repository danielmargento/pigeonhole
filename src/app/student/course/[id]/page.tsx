"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatComposer from "@/components/chat/ChatComposer";
import AssignmentSelect from "@/components/assignments/AssignmentSelect";
import SavedNotesPanel from "@/components/chat/SavedNotesPanel";
import { Assignment, BotConfig, Message } from "@/lib/types";
import { useUser } from "@/hooks/useUser";
import { parseConceptCheck } from "@/lib/conceptCheck";

export default function StudentCoursePage() {
  const { id: courseId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const resumeSessionId = searchParams.get("session");
  const { user, conceptChecksEnabled, setConceptChecksEnabled, loading: userLoading } = useUser();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [generalChatEnabled, setGeneralChatEnabled] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const sessionIdRef = useRef<string | null>(resumeSessionId);
  const isNewSessionRef = useRef(true);
  const sessionCacheRef = useRef<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"chat" | "notes">("chat");

  // Concept check state: messageId → conceptCheckId, conceptCheckId → studentAnswer, conceptCheckId → saved
  const [conceptCheckIds, setConceptCheckIds] = useState<Record<string, string>>({});
  const [conceptCheckAnswers, setConceptCheckAnswers] = useState<Record<string, number>>({});
  const [conceptCheckSaved, setConceptCheckSaved] = useState<Record<string, boolean>>({});

  // Load assignments
  useEffect(() => {
    fetch(`/api/assignments?course_id=${courseId}`)
      .then((r) => r.json())
      .then(setAssignments)
      .catch(() => {});
  }, [courseId]);

  // Load bot config (for general chat gating)
  useEffect(() => {
    fetch(`/api/bot-config?course_id=${courseId}`)
      .then((r) => r.json())
      .then((data: BotConfig | null) => {
        if (data && data.course_id) {
          setGeneralChatEnabled(data.general_chat_enabled ?? false);
        }
        setConfigLoaded(true);
      })
      .catch(() => setConfigLoaded(true));
  }, [courseId]);

  // Auto-select first assignment when general chat is off
  useEffect(() => {
    if (!configLoaded || resumeSessionId) return;
    if (!generalChatEnabled && !selectedAssignment && assignments.length > 0) {
      setSelectedAssignment(assignments[0].id);
    }
  }, [configLoaded, generalChatEnabled, assignments, selectedAssignment, resumeSessionId]);

  // If resuming a session, load its messages
  useEffect(() => {
    if (!resumeSessionId) return;
    sessionIdRef.current = resumeSessionId;
    isNewSessionRef.current = false;
    fetch(`/api/messages?session_id=${resumeSessionId}`)
      .then((r) => r.json())
      .then((data: Message[]) => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(() => {});
  }, [resumeSessionId]);

  // When assignment selection changes, load or create a session for that assignment
  useEffect(() => {
    if (resumeSessionId) return;

    const key = selectedAssignment ?? "general";

    if (sessionCacheRef.current[key]) {
      const cachedSessionId = sessionCacheRef.current[key];
      sessionIdRef.current = cachedSessionId;
      isNewSessionRef.current = false;
      fetch(`/api/messages?session_id=${cachedSessionId}`)
        .then((r) => r.json())
        .then((data: Message[]) => {
          if (Array.isArray(data)) setMessages(data);
        })
        .catch(() => setMessages([]));
      return;
    }

    const params = new URLSearchParams({ course_id: courseId });
    fetch(`/api/sessions?${params}`)
      .then((r) => r.json())
      .then((sessions) => {
        if (!Array.isArray(sessions)) return;
        const match = sessions.find((s: { assignment_id: string | null }) =>
          selectedAssignment ? s.assignment_id === selectedAssignment : !s.assignment_id
        );
        if (match) {
          sessionIdRef.current = match.id;
          isNewSessionRef.current = false;
          sessionCacheRef.current[key] = match.id;
          fetch(`/api/messages?session_id=${match.id}`)
            .then((r) => r.json())
            .then((data: Message[]) => {
              if (Array.isArray(data)) setMessages(data);
            })
            .catch(() => setMessages([]));
        } else {
          sessionIdRef.current = null;
          isNewSessionRef.current = true;
          setMessages([]);
        }
      })
      .catch(() => {
        sessionIdRef.current = null;
        isNewSessionRef.current = true;
        setMessages([]);
      });
  }, [selectedAssignment, courseId, resumeSessionId]);

  const ensureSession = async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course_id: courseId,
        assignment_id: selectedAssignment,
        title: "New Session",
      }),
    });
    const session = await res.json();
    sessionIdRef.current = session.id;
    isNewSessionRef.current = true;
    const key = selectedAssignment ?? "general";
    sessionCacheRef.current[key] = session.id;
    return session.id;
  };

  const saveMessage = async (
    sessionId: string,
    role: "user" | "assistant",
    content: string
  ): Promise<Message> => {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", session_id: sessionId, role, content }),
    });
    return res.json();
  };

  const autoTitleSession = async (sessionId: string, userMessage: string) => {
    const title = userMessage.slice(0, 60) + (userMessage.length > 60 ? "..." : "");
    await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, title }),
    });
  };

  const persistConceptCheck = async (
    sessionId: string,
    messageId: string,
    assistantText: string
  ) => {
    const { conceptCheck } = parseConceptCheck(assistantText);
    if (!conceptCheck) return;

    try {
      const res = await fetch("/api/concept-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          session_id: sessionId,
          assignment_id: selectedAssignment,
          course_id: courseId,
          question: conceptCheck.question,
          options: conceptCheck.options,
          correct_index: conceptCheck.correct,
          explanation: conceptCheck.explanation,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setConceptCheckIds((prev) => ({ ...prev, [messageId]: data.id }));
      }
    } catch {
      // ignore
    }
  };

  const handleConceptCheckAnswer = async (conceptCheckId: string, selectedIndex: number) => {
    setConceptCheckAnswers((prev) => ({ ...prev, [conceptCheckId]: selectedIndex }));
    await fetch("/api/concept-checks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "answer",
        concept_check_id: conceptCheckId,
        student_answer: selectedIndex,
      }),
    });
  };

  const handleToggleConceptCheckSave = async (conceptCheckId: string, saved: boolean) => {
    setConceptCheckSaved((prev) => ({ ...prev, [conceptCheckId]: saved }));
    await fetch("/api/concept-checks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: saved ? "save" : "unsave",
        concept_check_id: conceptCheckId,
      }),
    });
  };

  const handleSend = async (text: string) => {
    setStreaming(true);

    try {
      const sessionId = await ensureSession();
      const wasNewSession = isNewSessionRef.current && messages.length === 0;

      const savedUser = await saveMessage(sessionId, "user", text);
      setMessages((prev) => [...prev, savedUser]);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          session_id: sessionId,
          assignment_id: selectedAssignment,
          message: text,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const placeholderId = `tmp-${Date.now()}-a`;

      setMessages((prev) => [
        ...prev,
        {
          id: placeholderId,
          session_id: sessionId,
          role: "assistant" as const,
          content: "",
          saved: false,
          created_at: new Date().toISOString(),
        },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
          for (const line of lines) {
            const data = line.replace("data: ", "");
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantText += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === placeholderId ? { ...m, content: assistantText } : m
                  )
                );
              }
              // parsed.sources is emitted for metadata; inline [SOURCE] tags handle rendering
            } catch {
              // skip parse errors
            }
          }
        }
      }

      if (assistantText) {
        const savedAssistant = await saveMessage(sessionId, "assistant", assistantText);
        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? savedAssistant : m))
        );

        // Persist concept check if present
        persistConceptCheck(sessionId, savedAssistant.id, assistantText);

        if (wasNewSession) {
          isNewSessionRef.current = false;
          autoTitleSession(sessionId, text);
        }
      }
    } finally {
      setStreaming(false);
    }
  };

  const handleToggleSave = async (messageId: string, saved: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, saved } : m))
    );
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: saved ? "save" : "unsave",
        message_id: messageId,
      }),
    });
  };

  const toggleConceptChecks = async () => {
    const newValue = !conceptChecksEnabled;
    setConceptChecksEnabled(newValue);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept_checks_enabled: newValue }),
    });
  };

  if (userLoading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center h-[calc(100vh-120px)]">
        <p className="text-muted text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {activeTab === "chat" && (
            <>
              <AssignmentSelect
                assignments={assignments}
                selected={selectedAssignment}
                onSelect={setSelectedAssignment}
                generalChatEnabled={generalChatEnabled}
              />
              <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={conceptChecksEnabled}
                  onChange={toggleConceptChecks}
                  className="accent-accent rounded"
                />
                Quizzes
              </label>
              {streaming && (
                <span className="text-xs text-muted animate-pulse">Pascal is typing...</span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "chat"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "notes"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            Saved Notes
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-surface border border-border rounded-lg overflow-hidden relative">
        {activeTab === "chat" ? (
          <>
            {selectedAssignment && (() => {
              const assignment = assignments.find((a) => a.id === selectedAssignment);
              if (!assignment?.due_date) return null;
              const due = new Date(assignment.due_date);
              const now = new Date();
              const isPast = due < now;
              return (
                <div
                  className={`px-3 py-1.5 text-xs font-medium text-center border-b border-border ${
                    isPast
                      ? "bg-red-50 text-red-600"
                      : "bg-amber-50 text-amber-700 animate-pulse"
                  }`}
                >
                  {isPast ? "Past due" : "Due"}: {due.toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZoneName: "short",
                  })}
                </div>
              );
            })()}
            <ChatWindow
              messages={messages}
              onToggleSave={handleToggleSave}
              conceptCheckIds={conceptCheckIds}
              conceptCheckAnswers={conceptCheckAnswers}
              onConceptCheckAnswer={handleConceptCheckAnswer}
              conceptCheckSaved={conceptCheckSaved}
              onToggleConceptCheckSave={handleToggleConceptCheckSave}
            />
            <div className="flex items-end gap-3 border-t border-border bg-surface p-3">
              <img
                src="/logo.png"
                alt="Pascal"
                className="h-12 w-12 sm:h-14 sm:w-14 object-contain animate-float shrink-0"
              />
              <div className="flex-1 min-w-0">
                <ChatComposer onSend={handleSend} disabled={streaming} />
              </div>
            </div>
          </>
        ) : (
          <SavedNotesPanel courseId={courseId} assignments={assignments} />
        )}
      </div>
    </div>
  );
}
