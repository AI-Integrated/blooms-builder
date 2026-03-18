CREATE OR REPLACE FUNCTION public.get_user_question_stats(user_uuid uuid)
 RETURNS TABLE(bloom_level text, difficulty text, knowledge_dimension text, count bigint, approved_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow users to query their own stats or admins to query all
  IF user_uuid != auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: can only view own statistics';
  END IF;

  RETURN QUERY
  SELECT 
    q.bloom_level,
    q.difficulty,
    q.knowledge_dimension,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE q.approved = true) as approved_count
  FROM public.questions q
  WHERE q.owner = user_uuid
  GROUP BY q.bloom_level, q.difficulty, q.knowledge_dimension
  ORDER BY count DESC;
END;
$function$;