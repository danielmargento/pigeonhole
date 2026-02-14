"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const { user, role, loading } = useUser();

  useEffect(() => {
    if (loading || !user) return;

    if (role === "instructor") {
      router.push("/admin/courses");
    } else {
      router.push("/student/courses");
    }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto text-center mt-24">
        <p className="text-muted text-sm">Loading...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="max-w-xl mx-auto text-center mt-24">
        <p className="text-muted text-sm">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6">
      {/* Hero */}
      <section className="text-center pt-16 pb-14">
        <div className="text-5xl mb-4">🎓</div>
        <h1 className="text-4xl font-normal text-foreground mb-3">Course TA</h1>
        <p className="text-lg text-muted max-w-lg mx-auto leading-relaxed">
          AI teaching assistants that help students learn — not cheat.
          Instructors set the rules, students get the guidance.
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <Link
            href="/signup"
            className="bg-accent text-white px-6 py-2.5 rounded text-sm hover:bg-accent-hover transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="border border-border text-foreground px-6 py-2.5 rounded text-sm hover:bg-accent-light transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border pt-12 pb-12">
        <h2 className="text-2xl text-foreground text-center mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="text-sm text-accent mb-2">Instructors</div>
            <h3 className="text-base text-foreground mb-1.5">Set the guardrails</h3>
            <p className="text-sm text-muted leading-relaxed">
              Choose what the bot can and can't reveal — no final answers, no full code,
              hints only. Pick a teaching style and upload course materials.
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="text-sm text-accent mb-2">Students</div>
            <h3 className="text-base text-foreground mb-1.5">Ask for help</h3>
            <p className="text-sm text-muted leading-relaxed">
              Chat with an AI TA that knows your course, your assignments, and your
              instructor's policies. Get hints, explanations, and debugging guidance.
            </p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="text-sm text-accent mb-2">Learning</div>
            <h3 className="text-base text-foreground mb-1.5">Scaffolded, not spoon-fed</h3>
            <p className="text-sm text-muted leading-relaxed">
              The bot guides you step by step — concept checks, targeted hints, "try this
              next" prompts — so you actually understand the material.
            </p>
          </div>
        </div>
      </section>

      {/* Why this exists */}
      <section className="border-t border-border pt-12 pb-16">
        <h2 className="text-2xl text-foreground text-center mb-4">Why this exists</h2>
        <div className="max-w-2xl mx-auto space-y-4 text-sm text-muted leading-relaxed">
          <p>
            Students have always used every resource available to them — office hours,
            study groups, Stack Overflow, and now AI. The problem isn't that students
            use AI. It's that general-purpose chatbots have no concept of course policy,
            academic integrity, or pedagogical intent. They'll happily hand over a full
            solution the night before a deadline.
          </p>
          <p>
            Course TA flips the model. Instead of banning AI and hoping for the best,
            instructors define exactly how the AI should help: which topics are fair game,
            what level of detail is appropriate, and when the bot should push back and
            ask the student to try first. The result is an AI that teaches the way the
            instructor would — available 24/7, infinitely patient, and policy-aware.
          </p>
          <p>
            For students, it means getting unstuck at 2 AM without waiting for office hours.
            For instructors, it means knowing that the help students receive is aligned with
            their learning objectives — not undermining them.
          </p>
        </div>
      </section>
    </div>
  );
}
