"use client";

import { useState } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatComposer({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 min-w-0 flex-1">
      <textarea
        className="flex-1 border border-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-accent bg-background"
        rows={2}
        placeholder="Ask a question or paste your current attempt..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="bg-accent text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-40 hover:bg-accent-hover transition-colors self-end"
      >
        Send
      </button>
    </form>
  );
}
