import { useState, useEffect } from 'react';
import { getUserProfile } from '@/lib/supabaseClient';

export interface UserProfile {
  id: string;
  role: 'admin' | 'teacher';
  full_name?: string;
  email?: string;
  created_at?: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserProfile();
        setProfile(data as UserProfile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserProfile();
      setProfile(data as UserProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error,
    refetch,
    isAdmin: profile?.role === 'admin',
    isTeacher: profile?.role === 'teacher'
  };
}