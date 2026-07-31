begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

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
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls-one@example.test',
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls-two@example.test',
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.courses (id, user_id, name, code)
values
  (
    '11000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'User One Course',
    'ONE'
  ),
  (
    '22000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'User Two Course',
    'TWO'
  );

insert into public.assignments (course_id, title)
values
  ('11000000-0000-0000-0000-000000000001', 'User One Assignment'),
  ('22000000-0000-0000-0000-000000000002', 'User Two Assignment');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);

select results_eq(
  $$select name from public.courses order by name$$,
  $$values ('User One Course'::text)$$,
  'a user sees only their own courses'
);
select results_eq(
  $$select title from public.assignments order by title$$,
  $$values ('User One Assignment'::text)$$,
  'a user sees only assignments from their courses'
);
select ok(
  public.is_course_owner('11000000-0000-0000-0000-000000000001'),
  'course ownership helper accepts the owner'
);
select ok(
  not public.is_course_owner('22000000-0000-0000-0000-000000000002'),
  'course ownership helper rejects another user'
);
select lives_ok(
  $$insert into public.notes (user_id, title)
    values ('10000000-0000-0000-0000-000000000001', 'Own note')$$,
  'a user can insert their own note'
);
select throws_ok(
  $$insert into public.notes (user_id, course_id, title)
    values (
      '10000000-0000-0000-0000-000000000001',
      '22000000-0000-0000-0000-000000000002',
      'Cross-user note'
    )$$,
  '42501',
  'new row violates row-level security policy for table "notes"',
  'a user cannot attach a note to another user course'
);
select is(
  (select count(*) from public.notes),
  1::bigint,
  'only the authorized note was created'
);

select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000002',
  true
);
select results_eq(
  $$select name from public.courses order by name$$,
  $$values ('User Two Course'::text)$$,
  'changing identity changes the visible tenant'
);

select * from finish();
rollback;
