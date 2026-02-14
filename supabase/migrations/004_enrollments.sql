-- Add class_code column to courses (unique 6-char alphanumeric)
alter table courses add column class_code text unique;

-- Backfill existing courses with random class codes
update courses set class_code = upper(substr(md5(random()::text), 1, 6))
where class_code is null;

alter table courses alter column class_code set not null;

-- Enrollments table
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (course_id, student_id)
);
