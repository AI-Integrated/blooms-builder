
-- Create server-side function for secure role assignment
CREATE OR REPLACE FUNCTION public.assign_user_role(
  target_user_id UUID,
  new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- Validate role value
  IF new_role NOT IN ('admin', 'teacher', 'none') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Prevent removing own admin role
  IF target_user_id = auth.uid() THEN
    IF new_role != 'admin' THEN
      RAISE EXCEPTION 'Cannot remove your own admin role';
    END IF;
  END IF;
  
  -- Delete existing roles
  DELETE FROM user_roles WHERE user_id = target_user_id;
  
  -- Insert new role (skip if 'none')
  IF new_role != 'none' THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (target_user_id, new_role::app_role);
  END IF;
  
  -- Log the change
  INSERT INTO activity_log (user_id, entity_type, entity_id, action, meta)
  VALUES (
    auth.uid(),
    'user_role',
    target_user_id,
    'role_assigned',
    jsonb_build_object('new_role', new_role)
  );
END;
$$;
