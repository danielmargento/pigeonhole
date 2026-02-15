"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatComposer from "@/components/chat/ChatComposer";
import AssignmentSelect from "@/components/assignments/AssignmentSelect";
import ExportButton from "@/components/pdf/ExportButton";
import { Announcement, Assignment, Message } from "@/lib/types";
import { useUser } from "@/hooks/useUser";

export default function StudentCoursePage() {
  const { id: courseId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const resumeSessionId = searchParams.get("session");
  const { user, loading: userLoading } = useUser();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const sessionIdRef = useRef<string | null>(resumeSessionId);
  const isNewSessionRef = useRef(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncements, setShowAnnouncements] = useState(true);

  // Load assignments
  useEffect(() => {
    fetch(`/api/assignments?course_id=${courseId}`)
      .then((r) => r.json())
      .then(setAssignments)
      .catch(() => {});
  }, [courseId]);

  // Load announcements
  useEffect(() => {
    fetch(`/api/announcements?course_id=${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAnnouncements(data);
          // Mark unviewed ones as viewed
          data.forEach((a: Announcement) => {
            if (!a.viewed) {
              fetch("/api/announcements/view", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ announcement_id: a.id }),
              });
            }
          });
        }
      })
      .catch(() => {});
  }, [courseId]);

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

  const handleSend = async (text: string) => {
    setStreaming(true);

    try {
      const sessionId = await ensureSession();
      const wasNewSession = isNewSessionRef.current && messages.length === 0;

      // Save user message to DB and add to state with real ID
      const savedUser = await saveMessage(sessionId, "user", text);
      setMessages((prev) => [...prev, savedUser]);

      // Start streaming
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

      // Add placeholder for streaming assistant message
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
              assistantText += parsed.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId ? { ...m, content: assistantText } : m
                )
              );
            } catch {
              // skip parse errors
            }
          }
        }
      }

      // Save assistant message to DB and replace placeholder with real ID
      if (assistantText) {
        const savedAssistant = await saveMessage(sessionId, "assistant", assistantText);
        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? savedAssistant : m))
        );

        // Auto-title after first exchange on a new session
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

  const handleFeedback = async (messageId: string, rating: string) => {
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "feedback", message_id: messageId, rating }),
    });
  };

  const savedMessages = messages.filter((m) => m.saved);

  if (userLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-[calc(100vh-120px)]">
        <p className="text-muted text-sm">Loading...</p>
      </div>
    );
  }

  const unviewedCount = announcements.filter((a) => !a.viewed).length;

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-120px)]">
      {announcements.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowAnnouncements(!showAnnouncements)}
            className="text-xs text-accent hover:underline mb-2"
          >
            {showAnnouncements ? "Hide" : "Show"} announcements ({announcements.length})
            {unviewedCount > 0 && !showAnnouncements && (
              <span className="ml-1 bg-accent text-white px-1.5 py-0.5 rounded-full text-[10px]">
                {unviewedCount} new
              </span>
            )}
          </button>
          {showAnnouncements && (
            <div className="space-y-2">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className={`p-3 border rounded-lg text-sm ${
                    a.viewed
                      ? "bg-background border-border"
                      : "bg-accent-light border-accent/20"
                  }`}
                >
                  <p className="text-foreground whitespace-pre-wrap">{a.content}</p>
                  <span className="text-xs text-muted mt-1 block">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <AssignmentSelect
            assignments={assignments}
            selected={selectedAssignment}
            onSelect={setSelectedAssignment}
          />
          {streaming && (
            <span className="text-xs text-muted animate-pulse">TA is typing...</span>
          )}
        </div>
        <ExportButton messages={savedMessages} title="Saved Messages" />
      </div>
      <div className="flex-1 flex flex-col bg-surface border border-border rounded-lg overflow-hidden relative">
        <ChatWindow
          messages={messages}
          onToggleSave={handleToggleSave}
          onFeedback={handleFeedback}
        />
        {selectedAssignment && (() => {
          const assignment = assignments.find((a) => a.id === selectedAssignment);
          if (!assignment?.due_date) return null;
          const due = new Date(assignment.due_date);
          const now = new Date();
          const isPast = due < now;
          return (
            <div
              className={`px-3 py-1.5 text-xs font-medium text-center border-t border-border ${
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
        <div className="flex items-end gap-3 border-t border-border bg-surface p-3">
          <img
            src="/logo.png"
            alt="pigeonhole TA"
            className="h-12 w-12 sm:h-14 sm:w-14 object-contain animate-float shrink-0"
          />
          <div className="flex-1 min-w-0">
            <ChatComposer onSend={handleSend} disabled={streaming} />
          </div>
        </div>
      </div>
    </div>
  );
}
