import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  errors: any;
}

export interface UseRealtimeOptions {
  table: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: RealtimePayload) => void;
}

/**
 * Hook for subscribing to real-time database changes
 */
export function useRealtime(channelName: string, options: UseRealtimeOptions) {
  const { table, filter, onInsert, onUpdate, onDelete, onChange } = options;

  const handleChange = useCallback((payload: any) => {
    const realtimePayload: RealtimePayload = {
      eventType: payload.eventType,
      new: payload.new,
      old: payload.old,
      errors: payload.errors
    };

    // Call specific event handlers
    switch (payload.eventType) {
      case 'INSERT':
        onInsert?.(payload.new);
        break;
      case 'UPDATE':
        onUpdate?.(payload.new);
        break;
      case 'DELETE':
        onDelete?.(payload.old);
        break;
    }

    // Call general change handler
    onChange?.(realtimePayload);
  }, [onInsert, onUpdate, onDelete, onChange]);

  useEffect(() => {
    let channel: RealtimeChannel;
    let mounted = true;

    const setupChannel = async () => {
      try {
        // Remove any existing channel with the same name first
        const existingChannels = supabase.getChannels();
        const existingChannel = existingChannels.find(ch => ch.topic === channelName);
        if (existingChannel) {
          await supabase.removeChannel(existingChannel);
        }

        channel = supabase.channel(channelName);

        // Set up postgres changes subscription
        const changeConfig: any = {
          event: '*',
          schema: 'public',
          table
        };

        if (filter) {
          changeConfig.filter = filter;
        }

        channel
          .on('postgres_changes', changeConfig, (payload) => {
            if (mounted) {
              handleChange(payload);
            }
          })
          .subscribe((status) => {
            if (!mounted) return;
            
            if (status === 'SUBSCRIBED') {
              console.log(`Subscribed to realtime updates for ${table}`);
            } else if (status === 'CHANNEL_ERROR') {
              console.error(`Failed to subscribe to ${table} updates`);
            } else if (status === 'CLOSED') {
              console.warn(`Channel closed for ${table}, attempting to reconnect...`);
              // Retry connection after a short delay
              setTimeout(() => {
                if (mounted) {
                  setupChannel();
                }
              }, 3000);
            }
          });
      } catch (error) {
        console.error(`Error setting up realtime channel for ${table}:`, error);
      }
    };

    setupChannel();

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channelName, table, filter, handleChange]);

  return {
    // Utility function to manually trigger a refresh
    refresh: () => {
      console.log(`Refreshing ${table} data`);
    }
  };
}

/**
 * Hook for real-time presence tracking
 */
export function usePresence(roomId: string, userData: { name: string; email: string }) {
  const [presenceState, setPresenceState] = useState<{
    users: Array<{ id: string; name: string; email: string; lastSeen: string }>;
    isConnected: boolean;
  }>({
    users: [],
    isConnected: false
  });

  useEffect(() => {
    const channel = supabase.channel(`presence:${roomId}`, {
      config: {
        presence: { key: userData.email }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users = Object.values(presenceState).flat().map((presence: any) => ({
          id: presence.id || presence.email,
          name: presence.name,
          email: presence.email,
          lastSeen: presence.lastSeen || new Date().toISOString()
        }));
        
        setPresenceState({
          users,
          isConnected: true
        });
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            ...userData,
            id: userData.email,
            lastSeen: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userData.name, userData.email]);

  return presenceState;
}