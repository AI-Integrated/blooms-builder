import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Plus, 
  Mail, 
  Shield, 
  Eye, 
  Edit, 
  Crown, 
  Clock,
  Share2,
  UserPlus,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRealtime } from '@/hooks/useRealtime';

interface Collaborator {
  id: string;
  user_email: string;
  user_name: string;
  role: 'owner' | 'editor' | 'viewer';
  invited_by?: string;
  invited_at: string;
  accepted_at?: string;
  last_active: string;
}

interface CollaborativeDocumentManagerProps {
  documentId: string;
  documentType: 'tos' | 'question' | 'test' | 'rubric';
  documentTitle: string;
  currentUserEmail: string;
  isOwner: boolean;
}

export const CollaborativeDocumentManager: React.FC<CollaborativeDocumentManagerProps> = ({
  documentId,
  documentType,
  documentTitle,
  currentUserEmail,
  isOwner
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'viewer' as 'editor' | 'viewer'
  });
  const [realtimeActivity, setRealtimeActivity] = useState<any[]>([]);

  // Real-time collaborator updates
  useRealtime('document-collaborators', {
    table: 'document_collaborators',
    filter: `document_id=eq.${documentId}`,
    onInsert: (newCollaborator) => {
      toast.info(`${newCollaborator.user_name} joined the document`);
      loadCollaborators();
    },
    onUpdate: (updatedCollaborator) => {
      toast.info(`${updatedCollaborator.user_name}'s role was updated`);
      loadCollaborators();
    },
    onDelete: (removedCollaborator) => {
      toast.info(`${removedCollaborator.user_name} was removed from the document`);
      loadCollaborators();
    }
  });

  // Real-time activity tracking
  useRealtime('document-activity-feed', {
    table: 'document_activity',
    filter: `document_id=eq.${documentId}`,
    onInsert: (newActivity) => {
      setRealtimeActivity(prev => [newActivity, ...prev.slice(0, 4)]);
    }
  });

  useEffect(() => {
    loadCollaborators();
  }, [documentId]);

  const loadCollaborators = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('document_collaborators')
        .select('*')
        .eq('document_id', documentId)
        .eq('document_type', documentType)
        .order('role', { ascending: true })
        .order('invited_at', { ascending: false });

      if (error) throw error;
      setCollaborators(data || []);
    } catch (error) {
      console.error('Error loading collaborators:', error);
      toast.error('Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  };

  const inviteCollaborator = async () => {
    if (!inviteForm.email.trim() || !inviteForm.name.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (inviteForm.email === currentUserEmail) {
      toast.error('You cannot invite yourself');
      return;
    }

    // Check if user is already a collaborator
    const existingCollaborator = collaborators.find(c => c.user_email === inviteForm.email);
    if (existingCollaborator) {
      toast.error('User is already a collaborator');
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('document_collaborators')
        .insert([{
          document_id: documentId,
          document_type: documentType,
          user_email: inviteForm.email,
          user_name: inviteForm.name,
          role: inviteForm.role,
          invited_by: currentUserEmail
        }]);

      if (error) throw error;

      // Log activity
      await (supabase as any)
        .from('document_activity')
        .insert([{
          document_id: documentId,
          document_type: documentType,
          user_email: currentUserEmail,
          user_name: 'Current User',
          action_type: 'invite',
          action_details: {
            invited_user: inviteForm.email,
            role: inviteForm.role
          }
        }]);

      toast.success(`Invited ${inviteForm.name} as ${inviteForm.role}`);
      setShowInviteDialog(false);
      setInviteForm({ email: '', name: '', role: 'viewer' });
      await loadCollaborators();
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      toast.error('Failed to send invitation');
    }
  };

  const updateCollaboratorRole = async (collaboratorId: string, newRole: 'editor' | 'viewer') => {
    try {
      const { error } = await (supabase as any)
        .from('document_collaborators')
        .update({ role: newRole })
        .eq('id', collaboratorId);

      if (error) throw error;

      toast.success('Collaborator role updated');
      await loadCollaborators();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('document_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;

      toast.success('Collaborator removed');
      await loadCollaborators();
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'editor':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Document Sharing
          </div>
          {isOwner && (
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Collaborator</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="inviteEmail">Email Address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="colleague@school.edu"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inviteName">Full Name</Label>
                    <Input
                      id="inviteName"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inviteRole">Role</Label>
                    <Select 
                      value={inviteForm.role} 
                      onValueChange={(value: 'editor' | 'viewer') => setInviteForm(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor - Can modify content</SelectItem>
                        <SelectItem value="viewer">Viewer - Can only view</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={inviteCollaborator} className="flex-1">
                      Send Invitation
                    </Button>
                    <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          <strong>{documentTitle}</strong> • {collaborators.length + 1} collaborator{collaborators.length !== 0 ? 's' : ''}
        </div>

        {/* Current User */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {currentUserEmail.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{currentUserEmail}</p>
              <p className="text-xs text-muted-foreground">You</p>
            </div>
          </div>
          <Badge variant="default" className="flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Owner
          </Badge>
        </div>

        {/* Collaborators List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : collaborators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No collaborators yet</p>
              {isOwner && (
                <p className="text-xs">Invite team members to work together</p>
              )}
            </div>
          ) : (
            collaborators.map((collaborator) => (
              <div key={collaborator.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {collaborator.user_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{collaborator.user_name}</p>
                    <p className="text-xs text-muted-foreground">{collaborator.user_email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Last active: {new Date(collaborator.last_active).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <Select
                      value={collaborator.role}
                      onValueChange={(value: 'editor' | 'viewer') => 
                        updateCollaboratorRole(collaborator.id, value)
                      }
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={getRoleBadgeVariant(collaborator.role)} className="flex items-center gap-1">
                      {getRoleIcon(collaborator.role)}
                      {collaborator.role}
                    </Badge>
                  )}
                  
                  {isOwner && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeCollaborator(collaborator.id)}
                      className="h-8 w-8 p-0"
                    >
                      {/* Remove icon - using span as placeholder */}
                      <span className="w-3 h-3">×</span>
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sharing Link */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Share Link</p>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view the document
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};