import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Edit, 
  Plus, 
  Trash2, 
  UserPlus, 
  Eye, 
  MessageSquare,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  document_id: string;
  document_type: string;
  user_email: string;
  user_name: string;
  action_type: 'create' | 'edit' | 'delete' | 'comment' | 'join' | 'leave' | 'invite';
  action_details?: any;
  timestamp: string;
}

interface RealtimeActivityFeedProps {
  documentId: string;
  documentType: string;
  maxItems?: number;
}

export const RealtimeActivityFeed: React.FC<RealtimeActivityFeedProps> = ({
  documentId,
  documentType,
  maxItems = 10
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();

    // Set up real-time subscription
    const channel = supabase
      .channel(`activity-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'document_activity',
          filter: `document_id=eq.${documentId}`
        },
        (payload) => {
          setActivities(prev => [payload.new as ActivityItem, ...prev.slice(0, maxItems - 1)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, maxItems]);

  const loadActivities = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('document_activity')
        .select('*')
        .eq('document_id', documentId)
        .eq('document_type', documentType)
        .order('timestamp', { ascending: false })
        .limit(maxItems);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'edit':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'join':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'leave':
        return <Eye className="w-4 h-4 text-gray-500" />;
      case 'invite':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionDescription = (activity: ActivityItem) => {
    switch (activity.action_type) {
      case 'create':
        return 'created the document';
      case 'edit':
        return 'made changes';
      case 'delete':
        return 'deleted content';
      case 'comment':
        return 'added a comment';
      case 'join':
        return 'joined the document';
      case 'leave':
        return 'left the document';
      case 'invite':
        return `invited ${activity.action_details?.invited_user}`;
      default:
        return 'performed an action';
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
    <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {activity.user_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {getActionIcon(activity.action_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user_name}</span>
                      {' '}
                      <span className="text-muted-foreground">
                        {getActionDescription(activity)}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};