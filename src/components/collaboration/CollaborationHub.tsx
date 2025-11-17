import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, Activity, Eye } from 'lucide-react';
import { RealTimeCollaborationPanel } from '@/components/RealTimeCollaborationPanel';
import { RealtimeActivityFeed } from '@/components/RealtimeActivityFeed';
import { useCollaborativeEditor } from '@/lib/collaboration';

interface CollaborationHubProps {
  documentId: string;
  documentType: 'question' | 'test' | 'tos';
  title?: string;
}

export function CollaborationHub({ documentId, documentType, title }: CollaborationHubProps) {
  const [activeTab, setActiveTab] = useState<'presence' | 'activity' | 'chat'>('presence');
  const { users, isConnected } = useCollaborativeEditor(documentId, documentType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Collaboration Hub
          </h2>
          <p className="text-muted-foreground mt-1">
            {title || `Real-time collaboration on ${documentType}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Badge>
          <Badge variant="outline">{users.length} active</Badge>
        </div>
      </div>

      {/* Main Content */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="presence" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Active Users
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent Activity
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Live Chat
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="min-h-[400px]">
          {activeTab === 'presence' && (
            <div className="space-y-4">
              <Card className="bg-muted/30 border-muted">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Active Users ({users.length})
                    </h3>
                    {users.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No other users currently active</p>
                    ) : (
                      <div className="space-y-2">
                        {users.map(user => (
                          <div key={user.id} className="flex items-center gap-2 p-2 rounded bg-background/50">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: user.color }}
                            />
                            <span className="text-sm font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">({user.email})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Collaboration Features
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Real-time presence tracking</li>
                    <li>• Live document editing with conflict resolution</li>
                    <li>• Activity feed for all changes</li>
                    <li>• User cursors and selections</li>
                    <li>• Instant notifications for updates</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'activity' && (
            <RealtimeActivityFeed 
              documentId={documentId}
              documentType={documentType}
            />
          )}

          {activeTab === 'chat' && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Real-time chat feature coming soon
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Now</p>
                <p className="text-2xl font-bold text-blue-600">Live</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-bold text-green-600">Connected</p>
              </div>
              <Activity className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sync</p>
                <p className="text-2xl font-bold text-purple-600">Real-time</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
