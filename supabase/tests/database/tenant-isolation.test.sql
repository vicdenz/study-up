begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(14);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '70000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'tenant-one@example.test',
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '80000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'tenant-two@example.test',
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.courses (id, user_id, name, code)
values
  (
    '71000000-0000-0000-0000-000000000007',
    '70000000-0000-0000-0000-000000000007',
    'Tenant One Course',
    'T1'
  ),
  (
    '82000000-0000-0000-0000-000000000008',
    '80000000-0000-0000-0000-000000000008',
    'Tenant Two Course',
    'T2'
  );

insert into public.assignments (id, course_id, title)
values
  (
    '71100000-0000-0000-0000-000000000007',
    '71000000-0000-0000-0000-000000000007',
    'Tenant One Assignment'
  ),
  (
    '82200000-0000-0000-0000-000000000008',
    '82000000-0000-0000-0000-000000000008',
    'Tenant Two Assignment'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '70000000-0000-0000-0000-000000000007',
  true
);

select lives_ok(
  $$
    insert into public.course_materials (course_id, title, type)
    values (
      '71000000-0000-0000-0000-000000000007',
      'Own course material',
      'text/plain'
    )
  $$,
  'a user can create metadata for their own course material'
);
select throws_ok(
  $$
    insert into public.course_materials (course_id, title, type)
    values (
      '82000000-0000-0000-0000-000000000008',
      'Cross-user course material',
      'text/plain'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "course_materials"',
  'a user cannot create metadata in another course'
);
select lives_ok(
  $$
    insert into public.assignment_materials (assignment_id, title, type)
    values (
      '71100000-0000-0000-0000-000000000007',
      'Own assignment material',
      'text/plain'
    )
  $$,
  'a user can create metadata for their own assignment material'
);
select throws_ok(
  $$
    insert into public.assignment_materials (assignment_id, title, type)
    values (
      '82200000-0000-0000-0000-000000000008',
      'Cross-user assignment material',
      'text/plain'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "assignment_materials"',
  'a user cannot create metadata for another user assignment'
);
select lives_ok(
  $$
    insert into public.study_sessions (
      user_id,
      course_id,
      title,
      scheduled_date,
      duration
    )
    values (
      '70000000-0000-0000-0000-000000000007',
      '71000000-0000-0000-0000-000000000007',
      'Own study session',
      now() + interval '1 day',
      60
    )
  $$,
  'a user can schedule a session for their own course'
);
select throws_ok(
  $$
    insert into public.study_sessions (
      user_id,
      course_id,
      title,
      scheduled_date,
      duration
    )
    values (
      '70000000-0000-0000-0000-000000000007',
      '82000000-0000-0000-0000-000000000008',
      'Cross-user study session',
      now() + interval '1 day',
      60
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "study_sessions"',
  'a user cannot schedule a session for another user course'
);
select lives_ok(
  $$
    insert into public.ai_chats (user_id, assignment_id, title, messages)
    values (
      '70000000-0000-0000-0000-000000000007',
      '71100000-0000-0000-0000-000000000007',
      'Own chat',
      '[]'::jsonb
    )
  $$,
  'a user can save a chat for their own assignment'
);
select throws_ok(
  $$
    insert into public.ai_chats (user_id, assignment_id, title, messages)
    values (
      '70000000-0000-0000-0000-000000000007',
      '82200000-0000-0000-0000-000000000008',
      'Cross-user chat',
      '[]'::jsonb
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "ai_chats"',
  'a user cannot save a chat for another user assignment'
);
select results_eq(
  $$select title from public.course_materials order by title$$,
  $$values ('Own course material'::text)$$,
  'course-material queries expose only owned data'
);
select results_eq(
  $$select title from public.assignment_materials order by title$$,
  $$values ('Own assignment material'::text)$$,
  'assignment-material queries expose only owned data'
);
select results_eq(
  $$select title from public.study_sessions order by title$$,
  $$values ('Own study session'::text)$$,
  'study-session queries expose only owned data'
);
select results_eq(
  $$select title from public.ai_chats order by title$$,
  $$values ('Own chat'::text)$$,
  'AI-chat queries expose only owned data'
);

select set_config(
  'request.jwt.claim.sub',
  '80000000-0000-0000-0000-000000000008',
  true
);
select is(
  (select count(*) from public.course_materials),
  0::bigint,
  'switching identity hides the first user course materials'
);
select is(
  (
    select count(*) from public.assignment_materials
  ),
  0::bigint,
  'switching identity hides the first user assignment materials'
);

select * from finish();
rollback;
