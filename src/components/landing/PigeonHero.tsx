"use client";

import { useEffect, useRef, useState } from "react";

const MESSAGES = [
  "Hi! I'm your AI TA.",
  "Ask me anything about your course!",
  "I help you learn, not cheat.",
  "Stuck at 2 AM? I've got you.",
  "Let's work through it together.",
];

const TYPE_DELAY = 80;
const PAUSE_AFTER_TYPING = 2000;
const DELETE_DELAY = 40;
const PAUSE_AFTER_DELETING = 500;

export default function PigeonHero() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [bubbleWidth, setBubbleWidth] = useState(0);

  const currentMessage = MESSAGES[messageIndex];

  useEffect(() => {
    if (measureRef.current) {
      setBubbleWidth(measureRef.current.scrollWidth + 40);
    }
  }, [displayedText]);

  useEffect(() => {
    if (!isDeleting) {
      if (displayedText.length < currentMessage.length) {
        const timer = setTimeout(() => {
          setDisplayedText(currentMessage.slice(0, displayedText.length + 1));
        }, TYPE_DELAY);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPING);
        return () => clearTimeout(timer);
      }
    } else {
      if (displayedText.length > 0) {
        const timer = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1));
        }, DELETE_DELAY);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setMessageIndex((i) => (i + 1) % MESSAGES.length);
          setIsDeleting(false);
        }, PAUSE_AFTER_DELETING);
        return () => clearTimeout(timer);
      }
    }
  }, [displayedText, isDeleting, currentMessage]);

  const effectiveWidth = Math.max(48, bubbleWidth);

  return (
    <div className="relative inline-block">
      {/* Pigeon */}
      <img
        src="/logo.png"
        alt="pigeonhole mascot"
        className="h-40 w-40 sm:h-52 sm:w-52 animate-float object-contain"
      />

      {/* Speech bubble positioned above-right, near the pigeon's head */}
      <div
        className="absolute -top-4 sm:-top-6 left-[55%] sm:left-[60%]"
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          className="relative bg-white border-2 border-border rounded-[1.25rem] px-4 py-2.5 shadow-sm overflow-hidden whitespace-nowrap"
          style={{
            width: effectiveWidth,
            minHeight: 36,
            transition: "width 0.15s ease-out",
          }}
        >
          {/* Hidden measurer */}
          <span
            ref={measureRef}
            className="text-sm leading-relaxed invisible absolute left-0 top-0"
            aria-hidden
          >
            {displayedText}
          </span>
          {/* Visible text */}
          <span className="text-sm text-foreground leading-relaxed">
            {displayedText}
            <span className="inline-block w-0.5 h-4 bg-foreground/60 animate-pulse ml-0.5 align-middle" />
          </span>
        </div>

        {/* Spike tail pointing down-left toward the pigeon's head */}
        <div
          className="absolute -bottom-[10px] left-3"
          aria-hidden
        >
          {/* White fill to cover the border */}
          <div
            className="absolute"
            style={{
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "12px solid white",
              top: "-1px",
              left: "1px",
            }}
          />
          {/* Border triangle */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "14px solid var(--border)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
