"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import PigeonHero from "@/components/landing/PigeonHero";

export default function HomePage() {
  const { user, role, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const dest = role === "instructor" ? "/admin/courses" : "/student/courses";
      router.replace(dest);
    }
  }, [loading, user, role, router]);

  if (loading || user) {
    return (
      <div className="max-w-xl mx-auto text-center mt-24">
        <p className="text-muted text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative pt-20 pb-14 overflow-hidden">
        {/* Envelope animations */}
        <style>{`
          @keyframes env1 {
            0%   { transform: translate(0, 0) rotate(-4deg); opacity: 0; }
            5%   { opacity: 0.7; }
            50%  { transform: translate(15vw, -30px) rotate(3deg); opacity: 0.7; }
            95%  { opacity: 0.7; }
            100% { transform: translate(30vw, 10px) rotate(-2deg); opacity: 0; }
          }
          @keyframes env2 {
            0%   { transform: translate(0, 0) rotate(3deg); opacity: 0; }
            5%   { opacity: 0.6; }
            50%  { transform: translate(-12vw, 25px) rotate(-4deg); opacity: 0.6; }
            95%  { opacity: 0.6; }
            100% { transform: translate(-25vw, -15px) rotate(2deg); opacity: 0; }
          }
          @keyframes env3 {
            0%   { transform: translate(0, 0) rotate(-2deg); opacity: 0; }
            5%   { opacity: 0.65; }
            50%  { transform: translate(18vw, 20px) rotate(5deg); opacity: 0.65; }
            95%  { opacity: 0.65; }
            100% { transform: translate(28vw, -20px) rotate(-3deg); opacity: 0; }
          }
          @keyframes env4 {
            0%   { transform: translate(0, 0) rotate(5deg); opacity: 0; }
            5%   { opacity: 0.55; }
            50%  { transform: translate(-14vw, -20px) rotate(-3deg); opacity: 0.55; }
            95%  { opacity: 0.55; }
            100% { transform: translate(-22vw, 15px) rotate(4deg); opacity: 0; }
          }
          .env1 { animation: env1 14s ease-in-out infinite; }
          .env2 { animation: env2 17s ease-in-out infinite; animation-delay: 3s; }
          .env3 { animation: env3 19s ease-in-out infinite; animation-delay: 7s; }
          .env4 { animation: env4 15s ease-in-out infinite; animation-delay: 10s; }
        `}</style>

        {/* Envelope 1: top-left, drifts right */}
        <div className="env1 absolute pointer-events-none" style={{ top: '8%', left: '3%' }}>
          <svg width="72" height="54" viewBox="0 0 72 54" fill="none">
            <rect x="4" y="10" width="40" height="28" rx="4" fill="#f5efe6" stroke="#c4b5a0" strokeWidth="1.5" />
            <path d="M4 10 L24 28 L44 10" fill="none" stroke="#c4b5a0" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Envelope 2: top-right, drifts left */}
        <div className="env2 absolute pointer-events-none" style={{ top: '15%', right: '5%' }}>
          <svg width="60" height="45" viewBox="0 0 60 45" fill="none">
            <rect x="4" y="8" width="34" height="24" rx="3.5" fill="#f5efe6" stroke="#c4b5a0" strokeWidth="1.5" />
            <path d="M4 8 L21 24 L38 8" fill="none" stroke="#c4b5a0" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Envelope 3: bottom-left, drifts right */}
        <div className="env3 absolute pointer-events-none" style={{ top: '65%', left: '5%' }}>
          <svg width="55" height="42" viewBox="0 0 55 42" fill="none">
            <rect x="3" y="7" width="30" height="22" rx="3" fill="#f5efe6" stroke="#c4b5a0" strokeWidth="1.5" />
            <path d="M3 7 L18 21 L33 7" fill="none" stroke="#c4b5a0" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Envelope 4: bottom-right, drifts left */}
        <div className="env4 absolute pointer-events-none" style={{ top: '72%', right: '4%' }}>
          <svg width="65" height="48" viewBox="0 0 65 48" fill="none">
            <rect x="4" y="9" width="36" height="26" rx="3.5" fill="#f5efe6" stroke="#c4b5a0" strokeWidth="1.5" />
            <path d="M4 9 L22 26 L40 9" fill="none" stroke="#c4b5a0" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="text-center relative z-10">
          <div className="flex justify-center mb-6">
            <PigeonHero />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-3 tracking-tight">
            pigeonhole
          </h1>
          <p className="text-lg text-muted max-w-md mx-auto leading-relaxed">
            An AI teaching assistant that actually helps students learn, without doing the work for them.
          </p>
          <div className="flex gap-3 justify-center mt-8">
            <Link
              href="/signup"
              className="bg-accent text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="border border-border text-foreground px-6 py-2.5 rounded text-sm font-medium hover:bg-accent-light transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border pt-12 pb-12 max-w-3xl mx-auto px-6">
        <h2 className="text-2xl text-foreground text-center mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg p-5 transition-shadow duration-200 hover:shadow-md cursor-default" style={{ backgroundColor: "#f5efe6", border: "1px solid #c4b5a0" }}>
            <div className="text-sm text-accent mb-2">Instructors</div>
            <h3 className="text-base text-foreground mb-1.5">You set the rules</h3>
            <p className="text-sm text-muted leading-relaxed">
              Decide exactly what the bot can share. Block full answers, limit code help,
              require students to show their work first. Upload your materials and you&apos;re good to go.
            </p>
          </div>
          <div className="rounded-lg p-5 transition-shadow duration-200 hover:shadow-md cursor-default" style={{ backgroundColor: "#f5efe6", border: "1px solid #c4b5a0" }}>
            <div className="text-sm text-accent mb-2">Students</div>
            <h3 className="text-base text-foreground mb-1.5">Get unstuck anytime</h3>
            <p className="text-sm text-muted leading-relaxed">
              Talk to a TA that actually knows your course. It&apos;ll nudge you in the right
              direction, explain tricky concepts, and help you debug. All without doing the work for you.
            </p>
          </div>
          <div className="rounded-lg p-5 transition-shadow duration-200 hover:shadow-md cursor-default" style={{ backgroundColor: "#f5efe6", border: "1px solid #c4b5a0" }}>
            <div className="text-sm text-accent mb-2">Learning</div>
            <h3 className="text-base text-foreground mb-1.5">Guided, not given</h3>
            <p className="text-sm text-muted leading-relaxed">
              Instead of handing you the answer, the bot walks you through it. It asks the right
              questions, drops hints, and lets you have the &ldquo;aha&rdquo; moment yourself.
            </p>
          </div>
        </div>
      </section>

      {/* Why we built this */}
      <section className="border-t border-border pt-12 pb-16 max-w-3xl mx-auto px-6">
        <h2 className="text-2xl text-foreground text-center mb-4">Why we built this</h2>
        <div className="max-w-2xl mx-auto space-y-4 text-sm text-muted leading-relaxed">
          <p>
            Let&apos;s be honest: students are going to use AI whether we like it or not.
            The problem isn&apos;t AI itself. It&apos;s that ChatGPT doesn&apos;t know your syllabus,
            your policies, or what you actually want students to learn. It&apos;ll just hand
            over the full answer without a second thought.
          </p>
          <p>
            pigeonhole takes a different approach. Instead of pretending AI doesn&apos;t exist,
            it puts instructors in control. You decide how much help is too much, which topics
            are off-limits, and when the bot should say &ldquo;show me what you&apos;ve tried first.&rdquo;
            Think of it as an AI TA that actually follows your rules, available around the clock
            and endlessly patient.
          </p>
          <p>
            For students, it means getting real help at 2 AM instead of staring at a problem set.
            For instructors, it means the help students get is actually aligned with how you teach,
            not working against it.
          </p>
        </div>
      </section>
    </div>
  );
}
