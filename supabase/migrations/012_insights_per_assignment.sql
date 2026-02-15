-- Allow per-assignment insight caching
alter table course_insights_cache add column assignment_id uuid references assignments(id) on delete cascade;

-- Drop the old unique constraint on course_id alone
alter table course_insights_cache drop constraint course_insights_cache_course_id_key;

-- Add new unique constraint: one cache row per course+assignment combo
-- (assignment_id NULL = course-wide insights)
create unique index idx_insights_cache_course_assignment
  on course_insights_cache (course_id, coalesce(assignment_id, '00000000-0000-0000-0000-000000000000'));
