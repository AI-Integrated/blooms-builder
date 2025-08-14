import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Plus, 
  Clock, 
  Settings
} from "lucide-react";

interface CollaborativeSession {
  id: string;
  document_type: string;
  title: string;
  collaborators: string[];
  is_active: boolean;
  last_activity: string;
  created_by: string;
}

export function CollaborativeDocumentManager() {
  const [sessions, setSessions] = useState<CollaborativeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      // Mock data for now since table doesn't exist yet
      setSessions([]);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch collaborative sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (documentType: string, title: string) => {
    try {
      // Mock creation for now
      console.log('Creating session:', documentType, title);

      toast({
        title: "Session Created",
        description: `Started collaborative session for ${title}`,
      });

      fetchSessions();
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create collaborative session",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Collaborative Sessions
          </h2>
          <p className="text-muted-foreground">
            Work together on tests and question banks in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => createSession('tos', `TOS - ${new Date().toLocaleDateString()}`)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New TOS Session
          </Button>
          <Button
            onClick={() => createSession('test', `Test - ${new Date().toLocaleDateString()}`)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Test Session
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Active Sessions</h3>
              <p className="text-muted-foreground mb-4">
                Create a new collaborative session to start working together.
              </p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">
                      {session.document_type.toUpperCase()}
                    </Badge>
                    {session.title}
                  </span>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Created by {session.created_by}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {session.collaborators.map((collaborator, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {collaborator}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}