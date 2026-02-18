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
  style_preset: StylePreset;
  due_date: string | null;
  overrides: Partial<PolicyConfig> | null;
  material_ids: string[];
  anchor_material_id: string | null;
  question_hints: { question: string; hint: string }[];
  annotations: PdfAnnotation[];
  created_at: string;
}

export interface PdfAnnotation {
  material_id: string;
  page: number;
  selected_text: string;
  hint: string;
}

export interface CourseMaterial {
  id: string;
  course_id: string;
  file_name: string;
  file_type: string;
  category: string;
  storage_path: string;
  extracted_text?: string;
  summary?: string;
  created_at: string;
}

export interface ParsedChunk {
  content: string;
  source_label: string;
  metadata: Record<string, unknown>;
}

export interface RetrievedChunk {
  id: string;
  material_id: string;
  course_id: string;
  chunk_index: number;
  content: string;
  source_label: string;
  metadata: Record<string, unknown>;
  similarity: number;
  file_name: string;
  file_type: string;
  category: string;
}

export interface BotConfig {
  id: string;
  course_id: string;
  style_preset: StylePreset;
  policy: PolicyConfig;
  context: string;
  general_chat_enabled: boolean;
  general_chat_material_ids: string[];
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
  users_per_assignment: { assignment_id: string; title: string; unique_users: number }[];
  llm_summary?: LLMInsightSummary | null;
}

export interface Announcement {
  id: string;
  course_id: string;
  author_id: string;
  content: string;
  created_at: string;
  view_count?: number;
  total_students?: number;
  viewed?: boolean;
}

export interface RosterStudent {
  id: string;
  first_name: string;
  last_name: string;
  enrolled_at: string;
}

export interface Feedback {
  id: string;
  message_id: string;
  rating: "helpful" | "not_helpful" | "too_revealing";
  created_at: string;
}

export interface ConceptCheck {
  id: string;
  session_id: string;
  assignment_id: string | null;
  course_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  student_answer: number | null;
  is_correct: boolean | null;
  created_at: string;
}

export interface ConceptCheckPayload {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface LLMInsightSummary {
  top_topics: { topic: string; count: number }[];
  misconceptions: { topic: string; description: string; sample_questions: string[] }[];
  generated_at: string;
}

export interface ConceptCheckAggregate {
  assignment_id: string;
  assignment_title: string;
  total_answered: number;
  total_correct: number;
  percent_correct: number;
}
