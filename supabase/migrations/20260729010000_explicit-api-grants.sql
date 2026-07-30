-- Make PostgREST privileges explicit so fresh projects do not depend on the
-- deprecated auto_expose_new_tables setting. RLS remains the authorization
-- boundary for authenticated requests.

REVOKE ALL ON TABLE
  public.profiles,
  public.courses,
  public.notes,
  public.assignments,
  public.course_materials,
  public.activities,
  public.study_sessions,
  public.ai_chats,
  public.assignment_materials,
  public.note_summaries
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.courses,
  public.notes,
  public.assignments,
  public.course_materials,
  public.activities,
  public.study_sessions,
  public.ai_chats,
  public.assignment_materials,
  public.note_summaries
TO authenticated;

GRANT ALL ON TABLE
  public.profiles,
  public.courses,
  public.notes,
  public.assignments,
  public.course_materials,
  public.activities,
  public.study_sessions,
  public.ai_chats,
  public.assignment_materials,
  public.note_summaries
TO service_role;

REVOKE ALL ON FUNCTION
  public.is_course_owner(uuid),
  public.is_course_owner_for_assignment(uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.is_course_owner(uuid),
  public.is_course_owner_for_assignment(uuid)
TO authenticated, service_role;
