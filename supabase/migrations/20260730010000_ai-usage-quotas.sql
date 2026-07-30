-- Bound per-user Gemini spend with atomic hourly and daily usage windows.

CREATE TABLE public.ai_usage_windows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name text NOT NULL CHECK (
    function_name IN ('chat-with-gemini', 'generate-study-plan')
  ),
  window_type text NOT NULL CHECK (window_type IN ('hour', 'day')),
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (user_id, function_name, window_type, window_start)
);

ALTER TABLE public.ai_usage_windows ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_usage_windows FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.ai_usage_windows TO service_role;

CREATE OR REPLACE FUNCTION public.consume_ai_quota(p_function_name text)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now timestamptz := statement_timestamp();
  v_hour_start timestamptz := date_trunc('hour', v_now);
  v_day_start timestamptz := date_trunc('day', v_now, 'UTC');
  v_hour_limit integer;
  v_day_limit integer;
  v_hour_count integer;
  v_day_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  CASE p_function_name
    WHEN 'chat-with-gemini' THEN
      v_hour_limit := 30;
      v_day_limit := 200;
    WHEN 'generate-study-plan' THEN
      v_hour_limit := 10;
      v_day_limit := 40;
    ELSE
      RAISE EXCEPTION 'Unknown AI function'
        USING ERRCODE = '22023';
  END CASE;

  -- Serialize quota consumption for one user/function pair. This prevents two
  -- concurrent requests from both observing the final available slot.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_function_name, 0)
  );

  SELECT usage.request_count
  INTO v_hour_count
  FROM public.ai_usage_windows AS usage
  WHERE usage.user_id = v_user_id
    AND usage.function_name = p_function_name
    AND usage.window_type = 'hour'
    AND usage.window_start = v_hour_start;

  SELECT usage.request_count
  INTO v_day_count
  FROM public.ai_usage_windows AS usage
  WHERE usage.user_id = v_user_id
    AND usage.function_name = p_function_name
    AND usage.window_type = 'day'
    AND usage.window_start = v_day_start;

  v_hour_count := coalesce(v_hour_count, 0);
  v_day_count := coalesce(v_day_count, 0);

  IF v_hour_count >= v_hour_limit THEN
    RETURN QUERY SELECT false, 0, v_hour_start + interval '1 hour';
    RETURN;
  END IF;
  IF v_day_count >= v_day_limit THEN
    RETURN QUERY SELECT false, 0, v_day_start + interval '1 day';
    RETURN;
  END IF;

  INSERT INTO public.ai_usage_windows (
    user_id,
    function_name,
    window_type,
    window_start,
    request_count
  )
  VALUES
    (v_user_id, p_function_name, 'hour', v_hour_start, 1),
    (v_user_id, p_function_name, 'day', v_day_start, 1)
  ON CONFLICT (user_id, function_name, window_type, window_start)
  DO UPDATE SET request_count = public.ai_usage_windows.request_count + 1;

  DELETE FROM public.ai_usage_windows AS usage
  WHERE usage.user_id = v_user_id
    AND usage.window_start < v_day_start - interval '7 days';

  RETURN QUERY
  SELECT
    true,
    least(v_hour_limit - v_hour_count - 1, v_day_limit - v_day_count - 1),
    v_hour_start + interval '1 hour';
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(text)
TO authenticated, service_role;

COMMENT ON FUNCTION public.consume_ai_quota(text) IS
  'Atomically consumes hourly and daily Gemini quota for the authenticated user.';
