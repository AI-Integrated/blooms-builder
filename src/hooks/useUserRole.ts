import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

export interface UserRole {
  role: 'admin' | 'teacher';
  isAdmin: boolean;
  isTeacher: boolean;
  loading: boolean;
}

export function useUserRole(): UserRole {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<'admin' | 'teacher'>('teacher');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('teacher');
        } else {
          setRole((data?.role as 'admin' | 'teacher') || 'teacher');
        }
      } catch (err) {
        console.error('Error in fetchUserRole:', err);
        setRole('teacher');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchUserRole();
    }
  }, [user, authLoading]);

  return {
    role,
    isAdmin: role === 'admin',
    isTeacher: role === 'teacher',
    loading: loading || authLoading
  };
}