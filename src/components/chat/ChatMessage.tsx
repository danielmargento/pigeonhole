"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";
import { Message } from "@/lib/types";
import SaveToggle from "./SaveToggle";

interface Props {
  message: Message;
  onToggleSave?: (messageId: string, saved: boolean) => void;
  onFeedback?: (messageId: string, rating: string) => void;
}

export default function ChatMessage({ message, onToggleSave, onFeedback }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
          isUser
            ? "bg-accent text-white"
            : "bg-surface border border-border text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {!isUser && (
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-xs text-muted">
            <SaveToggle
              saved={message.saved}
              onToggle={() => onToggleSave?.(message.id, !message.saved)}
            />
            <button
              onClick={() => onFeedback?.(message.id, "helpful")}
              className="hover:text-accent transition-colors"
            >
              Helpful
            </button>
            <button
              onClick={() => onFeedback?.(message.id, "not_helpful")}
              className="hover:text-red-500 transition-colors"
            >
              Not helpful
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
