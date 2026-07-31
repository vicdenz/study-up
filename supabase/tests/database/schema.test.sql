begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'courses', 'courses table exists');
select has_table('public', 'assignments', 'assignments table exists');
select has_table('public', 'course_materials', 'course materials table exists');
select has_table('public', 'assignment_materials', 'assignment materials table exists');
select has_table('public', 'notes', 'notes table exists');
select has_table('public', 'note_summaries', 'note summaries table exists');
select has_table('public', 'study_sessions', 'study sessions table exists');
select has_table('public', 'ai_chats', 'AI chats table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.courses'::regclass),
  'courses has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.notes'::regclass),
  'notes has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.ai_chats'::regclass),
  'AI chats has RLS enabled'
);
select has_index('public', 'courses', 'idx_courses_user_id', 'course ownership index exists');
select has_index(
  'public',
  'assignment_materials',
  'idx_assignment_materials_assignment_id',
  'assignment material foreign-key index exists'
);
select has_index(
  'public',
  'note_summaries',
  'idx_note_summaries_note_id',
  'note summary uniqueness index exists'
);
select is(
  (select public from storage.buckets where id = 'course-materials'),
  false,
  'course materials bucket is private'
);

select * from finish();
rollback;
