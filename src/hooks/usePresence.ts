import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  id: string;
  name: string;
  email: string;
  color: string;
  cursor?: { x: number; y: number };
  lastSeen: string;
}

export interface PresenceState {
  users: PresenceUser[];
  isConnected: boolean;
  currentUser: PresenceUser | null;
}

const USER_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red  
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export function usePresence(room: string, userData?: { name: string; email: string }) {
  const [state, setState] = useState<PresenceState>({
    users: [],
    isConnected: false,
    currentUser: null
  });
  
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const generateUser = useCallback(async (): Promise<PresenceUser | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return {
      id: user.id,
      name: userData?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
      email: userData?.email || user.email || '',
      color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
      lastSeen: new Date().toISOString()
    };
  }, [userData]);

  const updateCursor = useCallback((x: number, y: number) => {
    if (channel && state.currentUser) {
      channel.send({
        type: 'broadcast',
        event: 'cursor_move',
        payload: {
          userId: state.currentUser.id,
          cursor: { x, y }
        }
      });
    }
  }, [channel, state.currentUser]);

  const broadcastAction = useCallback((action: string, data: any) => {
    if (channel && state.currentUser) {
      channel.send({
        type: 'broadcast',
        event: 'user_action',
        payload: {
          userId: state.currentUser.id,
          action,
          data,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [channel, state.currentUser]);

  useEffect(() => {
    let mounted = true;

    const initializePresence = async () => {
      try {
        const currentUser = await generateUser();
        if (!currentUser || !mounted) return;

        const channelName = `presence:${room}`;
        const newChannel = supabase.channel(channelName, {
          config: {
            presence: { key: currentUser.id }
          }
        });

        // Set up presence tracking
        newChannel
          .on('presence', { event: 'sync' }, () => {
            if (!mounted) return;
            
            const presenceState = newChannel.presenceState();
            const users: PresenceUser[] = [];
            
            Object.values(presenceState).forEach(presences => {
              presences.forEach(presence => {
                 if (typeof presence === 'object' && presence !== null) {
                   users.push(presence as unknown as PresenceUser);
                 }
              });
            });

            setState(prev => ({
              ...prev,
              users,
              isConnected: true,
              currentUser: currentUser
            }));
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            console.log('User joined:', newPresences);
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            console.log('User left:', leftPresences);
          })
          .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
            if (!mounted || payload.userId === currentUser.id) return;
            
            setState(prev => ({
              ...prev,
              users: prev.users.map(user =>
                user.id === payload.userId
                  ? { ...user, cursor: payload.cursor }
                  : user
              )
            }));
          })
          .on('broadcast', { event: 'user_action' }, ({ payload }) => {
            if (!mounted || payload.userId === currentUser.id) return;
            
            // Handle user actions (typing, editing, etc.)
            console.log('User action:', payload);
          });

        // Subscribe and track presence
        await newChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && mounted) {
            await newChannel.track(currentUser);
            setState(prev => ({
              ...prev,
              currentUser,
              isConnected: true
            }));
          }
        });

        setChannel(newChannel);
      } catch (error) {
        console.error('Failed to initialize presence:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            isConnected: false
          }));
        }
      }
    };

    initializePresence();

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [room, generateUser]);

  // Mouse tracking for cursor position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      updateCursor(e.clientX, e.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [updateCursor]);

  return {
    ...state,
    updateCursor,
    broadcastAction
  };
}