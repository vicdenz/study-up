begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

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
    '50000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'storage-one@example.test',
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '60000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'storage-two@example.test',
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.courses (id, user_id, name, code)
values
  (
    '51000000-0000-0000-0000-000000000005',
    '50000000-0000-0000-0000-000000000005',
    'Storage One Course',
    'S1'
  ),
  (
    '62000000-0000-0000-0000-000000000006',
    '60000000-0000-0000-0000-000000000006',
    'Storage Two Course',
    'S2'
  );

insert into public.assignments (id, course_id, title)
values
  (
    '51100000-0000-0000-0000-000000000005',
    '51000000-0000-0000-0000-000000000005',
    'Storage One Assignment'
  ),
  (
    '62200000-0000-0000-0000-000000000006',
    '62000000-0000-0000-0000-000000000006',
    'Storage Two Assignment'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-0000-0000-000000000005',
  true
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'course-materials',
      '51000000-0000-0000-0000-000000000005/own-course.txt',
      '50000000-0000-0000-0000-000000000005'
    )
  $$,
  'a user can upload to a course they own'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'course-materials',
      '62000000-0000-0000-0000-000000000006/cross-course.txt',
      '50000000-0000-0000-0000-000000000005'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a user cannot upload to another user course'
);
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'course-materials',
      'assignment_materials/50000000-0000-0000-0000-000000000005/51100000-0000-0000-0000-000000000005/own-assignment.txt',
      '50000000-0000-0000-0000-000000000005'
    )
  $$,
  'a user can upload to an assignment they own'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'course-materials',
      'assignment_materials/60000000-0000-0000-0000-000000000006/51100000-0000-0000-0000-000000000005/forged-user.txt',
      '50000000-0000-0000-0000-000000000005'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'an assignment upload path must contain the caller identity'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'course-materials',
      'assignment_materials/50000000-0000-0000-0000-000000000005/62200000-0000-0000-0000-000000000006/cross-assignment.txt',
      '50000000-0000-0000-0000-000000000005'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a user cannot upload to another user assignment'
);
select results_eq(
  $$
    select name
    from storage.objects
    where bucket_id = 'course-materials'
    order by name
  $$,
  $$
    values
      ('51000000-0000-0000-0000-000000000005/own-course.txt'::text),
      ('assignment_materials/50000000-0000-0000-0000-000000000005/51100000-0000-0000-0000-000000000005/own-assignment.txt'::text)
  $$,
  'a user lists only authorized private objects'
);

select set_config(
  'request.jwt.claim.sub',
  '60000000-0000-0000-0000-000000000006',
  true
);
select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'course-materials'
  ),
  0::bigint,
  'a second user cannot list the first user objects'
);
select lives_ok(
  $$
    delete from storage.objects
    where bucket_id = 'course-materials'
      and name = '51000000-0000-0000-0000-000000000005/own-course.txt'
  $$,
  'an unauthorized delete is safely filtered by RLS'
);

reset role;
select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'course-materials'
  ),
  2::bigint,
  'the unauthorized delete did not remove an object'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-0000-0000-000000000005',
  true
);
select lives_ok(
  $$
    delete from storage.objects
    where bucket_id = 'course-materials'
      and name = '51000000-0000-0000-0000-000000000005/own-course.txt'
  $$,
  'an owner can delete their course object'
);
select lives_ok(
  $$
    delete from storage.objects
    where bucket_id = 'course-materials'
      and name like 'assignment_materials/%'
  $$,
  'an owner can delete their assignment object'
);

reset role;
select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'course-materials'
  ),
  0::bigint,
  'authorized deletes remove the private objects'
);

select * from finish();
rollback;
