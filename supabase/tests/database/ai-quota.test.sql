begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(21);

select has_table(
  'public',
  'ai_usage_windows',
  'AI usage windows table exists'
);
select has_pk(
  'public',
  'ai_usage_windows',
  'AI usage windows have a composite primary key'
);
select columns_are(
  'public',
  'ai_usage_windows',
  array[
    'user_id',
    'function_name',
    'window_type',
    'window_start',
    'request_count'
  ],
  'AI usage windows expose only quota bookkeeping columns'
);
select ok(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.ai_usage_windows'::regclass
  ),
  'AI usage windows have RLS enabled'
);
select has_function(
  'public',
  'consume_ai_quota',
  array['text'],
  'quota consumption function exists'
);
select is_definer(
  'public',
  'consume_ai_quota',
  array['text'],
  'quota consumption uses a controlled definer boundary'
);

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
    '30000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'quota-one@example.test',
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'quota-two@example.test',
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000003',
  true
);

select results_eq(
  $$select allowed, remaining
    from public.consume_ai_quota('chat-with-gemini')$$,
  $$values (true, 29)$$,
  'the first chat request consumes one of thirty hourly slots'
);

select throws_ok(
  $$select * from public.ai_usage_windows$$,
  '42501',
  'permission denied for table ai_usage_windows',
  'authenticated callers cannot inspect quota bookkeeping directly'
);

select throws_ok(
  $$select * from public.consume_ai_quota('unknown-function')$$,
  '22023',
  'Unknown AI function',
  'callers cannot create arbitrary quota categories'
);

select lives_ok(
  $$
    do $block$
    declare
      quota record;
    begin
      for request_number in 1..29 loop
        select *
        into quota
        from public.consume_ai_quota('chat-with-gemini');
        if not quota.allowed then
          raise exception 'chat quota ended before request thirty';
        end if;
      end loop;
    end
    $block$
  $$,
  'the remaining twenty-nine hourly chat requests are accepted'
);

select results_eq(
  $$select allowed, remaining
    from public.consume_ai_quota('chat-with-gemini')$$,
  $$values (false, 0)$$,
  'the thirty-first hourly chat request is rejected'
);

select set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000004',
  true
);
select results_eq(
  $$select allowed, remaining
    from public.consume_ai_quota('chat-with-gemini')$$,
  $$values (true, 29)$$,
  'one user exhausting quota does not affect another user'
);
select results_eq(
  $$select allowed, remaining
    from public.consume_ai_quota('generate-study-plan')$$,
  $$values (true, 9)$$,
  'study-plan generation has its own lower hourly limit'
);

select lives_ok(
  $$
    do $block$
    declare
      quota record;
    begin
      for request_number in 1..9 loop
        select *
        into quota
        from public.consume_ai_quota('generate-study-plan');
        if not quota.allowed then
          raise exception 'study-plan quota ended before request ten';
        end if;
      end loop;
    end
    $block$
  $$,
  'the remaining nine hourly study-plan requests are accepted'
);
select results_eq(
  $$select allowed, remaining
    from public.consume_ai_quota('generate-study-plan')$$,
  $$values (false, 0)$$,
  'the eleventh hourly study-plan request is rejected'
);

reset role;
select is(
  (
    select count(*)
    from public.ai_usage_windows
    where user_id = '30000000-0000-0000-0000-000000000003'
      and function_name = 'chat-with-gemini'
  ),
  2::bigint,
  'each used function records hourly and daily windows'
);
select is(
  (
    select max(request_count)
    from public.ai_usage_windows
    where user_id = '30000000-0000-0000-0000-000000000003'
      and function_name = 'chat-with-gemini'
  ),
  30,
  'a rejected request does not increment stored usage'
);
select is(
  (
    select max(request_count)
    from public.ai_usage_windows
    where user_id = '40000000-0000-0000-0000-000000000004'
      and function_name = 'generate-study-plan'
  ),
  10,
  'study-plan usage is counted independently'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select * from public.consume_ai_quota('chat-with-gemini')$$,
  '42501',
  'Authentication required',
  'quota cannot be consumed without an authenticated identity'
);

reset role;
select has_check(
  'public',
  'ai_usage_windows',
  'quota bookkeeping has domain constraints'
);
select col_is_fk(
  'public',
  'ai_usage_windows',
  'user_id',
  'auth',
  'users',
  'id',
  'quota rows are deleted with their Auth user'
);

select * from finish();
rollback;
