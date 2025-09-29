import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Wifi, 
  WifiOff, 
  MessageSquare, 
  Send, 
  Activity,
  Clock,
  Eye,
  Edit,
  Plus
} from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';
import { useRealtime } from '@/hooks/useRealtime';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CollaborationMessage {
  id: string;
  user_name: string;
  user_email: string;
  message: string;
  timestamp: string;
  document_id: string;
}

interface RealTimeCollaborationPanelProps {
  documentId: string;
  documentType: 'tos' | 'question' | 'test';
  documentTitle: string;
  currentUser: {
    name: string;
    email: string;
  };
}

export const RealTimeCollaborationPanel: React.FC<RealTimeCollaborationPanelProps> = ({
  documentId,
  documentType,
  documentTitle,
  currentUser
}) => {
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activities, setActivities] = useState<any[]>([]);

  // Presence tracking
  const { users: activeUsers, isConnected } = usePresence(`${documentType}-${documentId}`, currentUser);

  // Real-time messages
  useRealtime('collaboration-messages', {
    table: 'collaboration_messages',
    filter: `document_id=eq.${documentId}`,
    onInsert: (newMessage) => {
      setMessages(prev => [newMessage, ...prev]);
    }
  });

  // Real-time activity tracking
  useRealtime('collaboration-activity', {
    table: 'document_activity',
    filter: `document_id=eq.${documentId}`,
    onInsert: (newActivity) => {
      setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
    }
  });

  useEffect(() => {
    loadMessages();
    loadActivities();
  }, [documentId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('document_activity')
        .select('*')
        .eq('document_id', documentId)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;
      // For now, convert activity to message format
      const convertedMessages = (data || []).map(activity => ({
        id: activity.id,
        user_name: activity.user_name,
        user_email: activity.user_email,
        message: `${activity.action_type}: ${activity.action_details || 'Document update'}`,
        timestamp: activity.timestamp,
        document_id: activity.document_id
      }));
      setMessages(convertedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('document_activity')
        .select('*')
        .eq('document_id', documentId)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('document_activity')
        .insert([{
          document_id: documentId,
          document_type: documentType,
          user_name: currentUser.name,
          user_email: currentUser.email,
          action_type: 'message',
          action_details: newMessage.trim()
        }]);

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const logActivity = async (action: string, details?: any) => {
    try {
      await supabase
        .from('document_activity')
        .insert([{
          document_id: documentId,
          document_type: documentType,
          user_name: currentUser.name,
          user_email: currentUser.email,
          action_type: action,
          action_details: details
        }]);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            Collaboration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Connection</span>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Users</span>
              <Badge variant="outline">{activeUsers.length}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Document</span>
              <span className="text-sm font-medium">{documentTitle}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Active Users ({activeUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activeUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
            ))}
            {activeUsers.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No other users online</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    {activity.action_type === 'edit' ? (
                      <Edit className="w-3 h-3 text-blue-500" />
                    ) : activity.action_type === 'create' ? (
                      <Plus className="w-3 h-3 text-green-500" />
                    ) : (
                      <Eye className="w-3 h-3 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user_name}</span>
                      {' '}
                      <span className="text-muted-foreground">
                        {activity.action_type === 'edit' ? 'edited' : 
                         activity.action_type === 'create' ? 'created' : 'viewed'} the document
                      </span>
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Chat */}
      <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5" />
            Team Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32 mb-3">
            <div className="space-y-2">
              {messages.map((message) => (
                <div key={message.id} className="p-2 rounded-lg bg-muted/30">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm">{message.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{message.message}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center py-2 text-muted-foreground">
                  <p className="text-xs">No messages yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1"
            />
            <Button onClick={sendMessage} size="sm" disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};