# course-ta-bot

A web app where instructors create **course-specific, policy-constrained AI TAs**, and students chat with the bot for **scaffolded learning** (not answer-dumping). Includes a student dashboard, admin dashboard, per-course chat, and export-to-PDF for sharing on forums like EdStem.

---

## Product Overview

### Instructor/Admin can:
- Create/manage courses
- Configure **guardrails** (what the bot may/may not reveal; e.g., no final answers / no full code)
- Set a **refusal and help strategy** (ask for attempt first, give hints, concept checks, debugging steps)
- Choose a **teaching style preset** (Socratic, direct, debugging coach, exam review)
- Add course context (syllabus / lecture notes) and assignment prompts
- Define **topic gating** (“not yet taught” topics the bot should avoid or warn about)
- Add private staff notes (to guide hinting/refusals; never shown to students)
- Configure **allowed artifacts** (e.g., pseudocode allowed, solution outline disallowed)
- Preview/test bot behavior as a student (including “leak test” prompts)
- View lightweight **usage insights** (top questions/topics, most-confusing assignments; anonymized)

### Students can:
- View a dashboard of their courses
- Open a course and chat with that course’s AI TA
- Select an assignment (if available) to get assignment-aware help
- Ask for **concept explanations**, **hints**, and **debugging guidance** without getting full solutions (based on course policy)
- Paste their current work/attempt (text or code) to get more targeted feedback
- Receive **step-by-step scaffolding** (hint levels, concept checks, “try this next” prompts)
- See **references to course materials** when applicable (e.g., lecture/handout tags)
- Save/bookmark helpful messages or snippets during a session
- Export saved snippets (or a thread) to a **PDF** for sharing/discussion
- Provide quick feedback on responses (helpful / not helpful / too revealing)
- Resume past chat sessions per course/assignment

---

## Tech Stack
- Next.js (App Router) + TypeScript
- TailwindCSS
- Supabase (Postgres)
- LLM API calls via `/api/chat` (OpenAI/Anthropic/etc.)

---

## Repo Structure
### App Routes (Next.js App Router)
- `src/app/page.tsx` — landing / role select (optional)
- `src/app/student/courses/page.tsx` — student dashboard (course list)
- `src/app/student/course/[id]/page.tsx` — student course page (assignment selector + chat)
- `src/app/student/course/[id]/history/page.tsx` — past sessions (optional)
- `src/app/admin/courses/page.tsx` — admin dashboard (course list + create)
- `src/app/admin/course/[id]/page.tsx` — admin course config (tabs: Policy / Context / Assignments / Preview / Insights)
- `src/app/api/chat/route.ts` — chat endpoint (policy-aware response)
- `src/app/api/courses/route.ts` — create/list courses
- `src/app/api/assignments/route.ts` — create/list assignments
- `src/app/api/sessions/route.ts` — create/list chat sessions
- `src/app/api/messages/route.ts` — save/unsave messages, feedback (optional)

### UI Components
- `src/components/layout/AppShell.tsx` — top nav + side nav layout
- `src/components/courses/CourseCard.tsx`
- `src/components/courses/CourseHeader.tsx`
- `src/components/assignments/AssignmentSelect.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/ChatMessage.tsx`
- `src/components/chat/ChatComposer.tsx` — input + “paste attempt”
- `src/components/chat/SaveToggle.tsx` — bookmark message
- `src/components/admin/PolicyEditor.tsx` — guardrail toggles + refusal mode
- `src/components/admin/StylePresetSelect.tsx`
- `src/components/admin/ContextUploader.tsx` — paste/upload context
- `src/components/admin/AssignmentEditor.tsx` — prompt + staff notes + overrides + FAQ
- `src/components/admin/PreviewPanel.tsx`
- `src/components/admin/InsightsPanel.tsx` — lightweight usage counts
- `src/components/pdf/ExportButton.tsx`

### Lib / Logic
- `src/lib/supabaseClient.ts` — Supabase browser client
- `src/lib/supabaseServer.ts` — Supabase server client (route handlers)
- `src/lib/policy.ts` — guardrail + refusal logic, allowed artifacts, topic gating
- `src/lib/prompt.ts` — prompt builders (system + course + assignment + policy)
- `src/lib/analytics.ts` — simple aggregation helpers for insights
- `src/lib/pdf.ts` — export saved messages/thread to PDF
- `src/lib/types.ts` — shared TS types (Course, Assignment, BotConfig, Session, Message)

### Config / Constants
- `src/config/stylePresets.ts`
- `src/config/defaultPolicy.ts`

### Database
- `supabase/migrations/` — SQL migrations (optional, if using Supabase CLI)
