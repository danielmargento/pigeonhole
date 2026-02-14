# Course TA Bot — Project Structure Memo

## Overview

This is a Next.js (App Router) + TypeScript project that lets instructors create course-specific, policy-constrained AI teaching assistants. Students chat with the TA for scaffolded learning help. The app uses Supabase for persistence and OpenAI for LLM responses.

---

## Top-Level Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts (`dev`, `build`, `start`, `lint`) |
| `tsconfig.json` | TypeScript config with `@/` path alias pointing to `src/` |
| `next.config.ts` | Next.js configuration |
| `postcss.config.mjs` | PostCSS config for Tailwind |
| `eslint.config.mjs` | ESLint rules |
| `.env.local.example` | Template for required env vars (Supabase URL/key, OpenAI key) |

---

## `src/lib/` — Core Logic

| File | What it does |
|------|-------------|
| `types.ts` | All shared TypeScript interfaces: `Course`, `Assignment`, `BotConfig`, `PolicyConfig`, `Session`, `Message`, `StylePreset`, `TopicGate`, `UsageInsight`, `Feedback` |
| `supabaseClient.ts` | Browser-side Supabase client (uses `NEXT_PUBLIC_` env vars) |
| `supabaseServer.ts` | Server-side Supabase client factory for use in API route handlers |
| `policy.ts` | Guardrail logic — checks if a student message requests something disallowed (e.g. full solutions), checks topic gating, and builds a policy instruction block for the LLM system prompt |
| `prompt.ts` | Assembles the full system prompt sent to OpenAI by combining course info, teaching style, policy rules, course context, and assignment details (including staff notes and FAQ) |
| `analytics.ts` | Stub for aggregating usage insights (top topics, session/message counts) — needs real queries wired up |
| `pdf.ts` | Uses `jsPDF` to export an array of messages into a formatted PDF document |

---

## `src/config/` — Constants & Defaults

| File | What it does |
|------|-------------|
| `stylePresets.ts` | Four teaching style presets (Socratic, Direct, Debugging Coach, Exam Review) — each has a label, description, and a system prompt fragment injected into the LLM prompt |
| `defaultPolicy.ts` | Default guardrail settings: no final answers, no full code, require attempt first, 3 hint levels, allowed/disallowed artifact lists, and a default refusal message |

---

## `src/app/api/` — API Route Handlers

All routes are server-side Next.js route handlers.

| Route | Methods | What it does |
|-------|---------|-------------|
| `api/chat/route.ts` | POST | Main chat endpoint. Fetches course + config + assignment from Supabase, runs policy check, builds system prompt, streams response from OpenAI via SSE |
| `api/courses/route.ts` | GET, POST | List all courses / create a new course |
| `api/assignments/route.ts` | GET, POST | List assignments (filterable by `course_id`) / create a new assignment |
| `api/sessions/route.ts` | GET, POST | List sessions (filterable by `course_id`, `student_id`) / create a new session |
| `api/messages/route.ts` | POST | Save/unsave a message, or submit feedback (helpful/not helpful/too revealing) |

---

## `src/components/` — UI Components

All components are client components (`"use client"`).

### `layout/`
| Component | What it does |
|-----------|-------------|
| `AppShell.tsx` | Top-level layout — dark slate header with nav links (Student / Instructor), highlights active section |

### `courses/`
| Component | What it does |
|-----------|-------------|
| `CourseCard.tsx` | Card displaying a course (code badge, name, description) — links to either student or admin view |
| `CourseHeader.tsx` | Course title + description banner for detail pages |

### `assignments/`
| Component | What it does |
|-----------|-------------|
| `AssignmentSelect.tsx` | Dropdown to pick an assignment (or "General — no assignment") for the chat context |

### `chat/`
| Component | What it does |
|-----------|-------------|
| `ChatWindow.tsx` | Scrollable message list with empty state placeholder |
| `ChatMessage.tsx` | Single message bubble — teal for student, white card for TA. TA messages show save/feedback buttons |
| `ChatComposer.tsx` | Text input + Send button. Enter to send, Shift+Enter for newline |
| `SaveToggle.tsx` | Bookmark/unbookmark button on TA messages |

### `admin/`
| Component | What it does |
|-----------|-------------|
| `PolicyEditor.tsx` | Checkboxes for guardrails (allow answers, allow code, require attempt), hint level slider, refusal message textarea |
| `StylePresetSelect.tsx` | 2x2 card grid to pick teaching style (Socratic, Direct, etc.) |
| `ContextUploader.tsx` | Large textarea for pasting syllabus/lecture notes |
| `AssignmentEditor.tsx` | Form to create an assignment: title, prompt, staff notes, FAQ |
| `PreviewPanel.tsx` | Test the bot as a student — sends a message to `/api/chat` and streams the response |
| `InsightsPanel.tsx` | Displays usage stats (total sessions/messages, top topics) or an empty state |

### `pdf/`
| Component | What it does |
|-----------|-------------|
| `ExportButton.tsx` | Button that exports saved messages to a downloadable PDF |

---

## `src/app/` — Pages & Routes

| Route | Role | What it renders |
|-------|------|----------------|
| `/` | Both | Landing page with "Student Dashboard" and "Instructor Dashboard" buttons |
| `/student/courses` | Student | Course list — fetches from `/api/courses` and renders `CourseCard` grid |
| `/student/course/[id]` | Student | Chat interface — assignment selector, chat window with streaming, export button |
| `/student/course/[id]/history` | Student | List of past sessions for a course |
| `/admin/courses` | Admin | Course list + "New Course" form (collapsible) |
| `/admin/course/[id]` | Admin | Tabbed config page — Policy, Context, Assignments, Preview, Insights |

---

## `supabase/migrations/`

| File | What it does |
|------|-------------|
| `001_initial_schema.sql` | Creates 6 tables: `courses`, `bot_configs` (one per course), `assignments`, `sessions`, `messages`, `feedback`. Uses UUIDs, foreign keys with cascading deletes, and check constraints on `role` and `rating` columns |

---

## Design System

The app uses a Gradescope-inspired color scheme defined as CSS variables in `globals.css`:

- **Background**: `#f5f6f7` (light gray)
- **Surface**: `#ffffff` (white cards)
- **Accent**: `#1a6b5a` (teal — buttons, active states, links)
- **Foreground**: `#1a2332` (dark slate — text, header)
- **Border**: `#dce1e6` (subtle gray)
- **Muted**: `#6b7a8d` (secondary text)

---

## What's Not Wired Up Yet

- **Auth** — No login/signup; student and admin views are open
- **Persistence** — Chat messages live in local state only; not saved to Supabase yet
- **Bot config CRUD** — Admin config page edits state locally but doesn't persist to `bot_configs`
- **Session management** — Sessions aren't created/resumed from the DB
- **Analytics** — `aggregateInsights` is a stub returning empty data
- **Topic gating UI** — No editor for topic gates in the admin panel
- **Artifact list UI** — No editor for allowed/disallowed artifacts
