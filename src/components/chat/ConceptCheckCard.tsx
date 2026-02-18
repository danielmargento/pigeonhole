"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface Props {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  studentAnswer: number | null;
  onAnswer: (selectedIndex: number) => void;
  saved?: boolean;
  onToggleSave?: () => void;
}

export default function ConceptCheckCard({
  question,
  options,
  correctIndex,
  explanation,
  studentAnswer,
  onAnswer,
  saved,
  onToggleSave,
}: Props) {
  const [selected, setSelected] = useState<number | null>(studentAnswer);
  const answered = selected !== null;

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index);
    onAnswer(index);
  };

  return (
    <div className="mt-3 border border-accent/30 rounded-lg bg-accent/5 overflow-hidden">
      <div className="px-4 py-2 bg-accent/10 border-b border-accent/20 flex items-center justify-between">
        <span className="text-xs font-semibold text-accent uppercase tracking-wide">
          Concept Check
        </span>
        {onToggleSave && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            className={`text-xs transition-colors ${
              saved ? "text-accent font-medium" : "text-muted hover:text-accent"
            }`}
          >
            {saved ? "Saved" : "Save"}
          </button>
        )}
      </div>
      <div className="px-4 py-3 space-y-3">
        <p className="text-sm font-medium text-foreground">{question}</p>
        <div className="space-y-2">
          {options.map((option, i) => {
            let className =
              "w-full text-left px-3 py-2 rounded-md text-sm border transition-colors ";

            if (!answered) {
              className += "border-border bg-surface hover:border-accent/40 hover:bg-accent/5 cursor-pointer";
            } else if (i === correctIndex) {
              className += "border-green-400 bg-green-50 text-green-800";
            } else if (i === selected) {
              className += "border-red-400 bg-red-50 text-red-800";
            } else {
              className += "border-border bg-surface opacity-50";
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={answered}
                className={className}
              >
                {option}
              </button>
            );
          })}
        </div>
        {answered && (
          <div
            className={`text-xs px-3 py-2 rounded-md ${
              selected === correctIndex
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            <span className="font-semibold">
              {selected === correctIndex ? "Correct!" : "Not quite."}
            </span>{" "}
            <ReactMarkdown
              components={{
                p: ({ children }) => <span>{children}</span>,
              }}
            >
              {explanation}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
