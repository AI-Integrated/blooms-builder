DROP POLICY IF EXISTS "Collaborators can create messages" ON public.collaboration_messages;

CREATE POLICY "Collaborators can create messages"
ON public.collaboration_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_email = (SELECT profiles.email FROM public.profiles WHERE profiles.id = auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.document_collaborators dc
    WHERE dc.document_id = collaboration_messages.document_id
      AND dc.document_type = collaboration_messages.document_type
      AND dc.user_email = (SELECT profiles.email FROM public.profiles WHERE profiles.id = auth.uid())
  )
);