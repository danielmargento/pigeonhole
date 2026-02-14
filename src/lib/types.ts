export interface Course {
  id: string;
  name: string;
  code: string;
  description: string;
  class_code: string;
  created_at: string;
}

export interface Enrollment {
  id: string;
  course_id: string;
  student_id: string;
  enrolled_at: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  title: string;
  prompt: string;
  staff_notes: string;
  faq: string[];
  overrides: Partial<PolicyConfig> | null;
  created_at: string;
}

export interface BotConfig {
  id: string;
  course_id: string;
  style_preset: StylePreset;
  policy: PolicyConfig;
  context: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyConfig {
  allow_final_answers: boolean;
  allow_full_code: boolean;
  require_attempt_first: boolean;
  hint_levels: number;
  allowed_artifacts: string[];
  disallowed_artifacts: string[];
  refusal_message: string;
  topic_gates: TopicGate[];
}

export interface Session {
  id: string;
  course_id: string;
  assignment_id: string | null;
  student_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  saved: boolean;
  created_at: string;
}

export type StylePreset = "socratic" | "direct" | "debugging_coach" | "exam_review";

export interface TopicGate {
  topic: string;
  status: "not_yet_taught" | "allowed" | "warn";
  message?: string;
}

export interface UsageInsight {
  course_id: string;
  top_topics: { topic: string; count: number }[];
  top_assignments: { assignment_id: string; title: string; count: number }[];
  total_sessions: number;
  total_messages: number;
}

export interface Feedback {
  id: string;
  message_id: string;
  rating: "helpful" | "not_helpful" | "too_revealing";
  created_at: string;
}
