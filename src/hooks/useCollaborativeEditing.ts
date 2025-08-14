import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
  color: string;
  cursor?: { x: number; y: number };
}

interface CollaborativeState {
  users: User[];
  documentData: any;
  isConnected: boolean;
  currentUser: User | null;
}

interface UseCollaborativeEditingProps {
  documentId: string;
  documentType: 'tos' | 'question' | 'test' | 'rubric';
  initialData?: any;
  onDataChange?: (data: any) => void;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(320, 70%, 50%)',
  'hsl(40, 70%, 50%)',
  'hsl(160, 70%, 50%)',
];

export const useCollaborativeEditing = ({
  documentId,
  documentType,
  initialData,
  onDataChange
}: UseCollaborativeEditingProps) => {
  const [state, setState] = useState<CollaborativeState>({
    users: [],
    documentData: initialData || {},
    isConnected: false,
    currentUser: null
  });
  
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const generateRandomColor = useCallback(() => {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }, []);

  const generateCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return {
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
        email: user.email || '',
        color: generateRandomColor()
      };
    }
    return null;
  }, [generateRandomColor]);

  const broadcastChange = useCallback((data: any, changeType: string = 'update') => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'document_change',
        payload: {
          documentId,
          data,
          changeType,
          timestamp: new Date().toISOString(),
          userId: state.currentUser?.id
        }
      });
    }
  }, [channel, documentId, state.currentUser?.id]);

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

  const saveToDatabase = useCallback(async (data: any) => {
    try {
      const tableName = documentType === 'tos' ? 'tos_documents' : 
                       documentType === 'question' ? 'questions' : 'rubrics';
      
      // For now, we'll just broadcast the change
      // In a real implementation, you'd save to a collaborative_documents table
      console.log(`Saving ${documentType} to database:`, data);
    } catch (error) {
      console.error('Error saving to database:', error);
    }
  }, [documentType]);

  useEffect(() => {
    const initializeCollaboration = async () => {
      const currentUser = await generateCurrentUser();
      if (!currentUser) return;

      const channelName = `collaborative_${documentType}_${documentId}`;
      const newChannel = supabase.channel(channelName);

      // Set up presence tracking
      newChannel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = newChannel.presenceState();
          const users: User[] = [];
          Object.values(presenceState).forEach(presences => {
            presences.forEach(presence => {
              if (typeof presence === 'object' && presence !== null && 
                  'id' in presence && 'name' in presence && 'email' in presence && 'color' in presence) {
                users.push(presence as User);
              }
            });
          });
          setState(prev => ({ ...prev, users, isConnected: true }));
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('User joined:', newPresences);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('User left:', leftPresences);
        })
        .on('broadcast', { event: 'document_change' }, ({ payload }) => {
          if (payload.userId !== currentUser.id) {
            setState(prev => ({ ...prev, documentData: payload.data }));
            onDataChange?.(payload.data);
          }
        })
        .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
          if (payload.userId !== currentUser.id) {
            setState(prev => ({
              ...prev,
              users: prev.users.map(user =>
                user.id === payload.userId
                  ? { ...user, cursor: payload.cursor }
                  : user
              )
            }));
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await newChannel.track(currentUser);
            setState(prev => ({ ...prev, currentUser, isConnected: true }));
          }
        });

      setChannel(newChannel);
    };

    initializeCollaboration();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [documentId, documentType, generateCurrentUser, onDataChange]);

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
    broadcastChange,
    updateCursor,
    saveToDatabase
  };
};