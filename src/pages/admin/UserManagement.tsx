import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, RefreshCw, Plus, Pencil, Trash2 } from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  college: string | null;
  created_at: string;
  role: 'admin' | 'teacher' | null;
}

interface UserFormData {
  email: string;
  full_name: string;
  college: string;
  role: string;
  password: string;
}

const emptyForm: UserFormData = { email: '', full_name: '', college: '', role: 'teacher', password: '' };

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState<UserFormData>(emptyForm);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState<UserFormData>(emptyForm);
  const [deleteUser, setDeleteUser] = useState<UserWithRole | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, college, created_at')
        .order('created_at', { ascending: false });
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rolesError) throw rolesError;

      const roleMap = new Map<string, 'admin' | 'teacher'>();
      roles?.forEach(r => roleMap.set(r.user_id, r.role as 'admin' | 'teacher'));

      setUsers((profiles || []).map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name || '',
        college: p.college || null,
        created_at: p.created_at,
        role: roleMap.get(p.id) || null,
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'Failed to load users.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (user: UserWithRole) => {
    setEditUser(user);
    setEditForm({
      email: user.email,
      full_name: user.full_name,
      college: user.college || '',
      role: user.role || 'teacher',
      password: '',
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      setSaving(true);
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: editForm.full_name, college: editForm.college })
        .eq('id', editUser.id);
      if (profileError) throw profileError;

      toast({ title: 'Success', description: 'User updated successfully.' });
      setShowEditDialog(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({ title: 'Error', description: 'Failed to update user.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      setSaving(true);
      // Delete role first, then profile
      await supabase.from('user_roles').delete().eq('user_id', deleteUser.id);
      const { error } = await supabase.from('profiles').delete().eq('id', deleteUser.id);
      if (error) throw error;

      toast({ title: 'Success', description: 'User deleted successfully.' });
      setDeleteUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({ title: 'Error', description: 'Failed to delete user. You may need to remove this user from the Supabase Auth dashboard.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddTeacher = async () => {
    if (!addForm.email || !addForm.full_name) {
      toast({ title: 'Validation', description: 'Email and Full Name are required.', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);

      // Sign up user via Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: addForm.email,
        password: addForm.password || 'ChangeMe123!',
        options: {
          data: { full_name: addForm.full_name },
        },
      });
      if (signUpError) throw signUpError;

      // Update college if provided
      if (signUpData.user && addForm.college) {
        await supabase
          .from('profiles')
          .update({ college: addForm.college })
          .eq('id', signUpData.user.id);
      }

      // Update role if not default teacher
      if (signUpData.user && addForm.role === 'admin') {
        await supabase.from('user_roles').delete().eq('user_id', signUpData.user.id);
        await supabase.from('user_roles').insert([{ user_id: signUpData.user.id, role: 'admin' }]);
      }

      toast({ title: 'Success', description: `User ${addForm.email} added successfully. A confirmation email has been sent.` });
      setShowAddDialog(false);
      setAddForm(emptyForm);
      fetchUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({ title: 'Error', description: error.message || 'Failed to add user.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Management
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={() => { setAddForm(emptyForm); setShowAddDialog(true); }} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </Button>
            <Button variant="outline" onClick={fetchUsers} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found. Users will appear here after they sign up.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>College</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.full_name || '—'}</TableCell>
                    <TableCell>{user.college || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role || 'No Role'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                          <Pencil className="h-4 w-4 mr-1" /> Update
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteUser(user)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User</DialogTitle>
            <DialogDescription>Edit the user's details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Email</Label>
              <Input value={editForm.email} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Full Name</Label>
              <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <Label>College</Label>
              <Input value={editForm.college} onChange={e => setEditForm(f => ({ ...f, college: e.target.value }))} placeholder="e.g. College of Engineering" />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={editForm.role === 'admin' ? 'Admin' : 'Teacher'} disabled className="bg-muted" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Teacher Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Teacher</DialogTitle>
            <DialogDescription>Register a new faculty member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="faculty@school.edu" />
            </div>
            <div>
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Juan Dela Cruz" />
            </div>
            <div>
              <Label>College</Label>
              <Input value={addForm.college} onChange={e => setAddForm(f => ({ ...f, college: e.target.value }))} placeholder="e.g. College of Education" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={addForm.role} onValueChange={v => setAddForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Temporary Password <span className="text-destructive">*</span></Label>
              <Input type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddTeacher} disabled={saving}>{saving ? 'Adding...' : 'Add User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => { if (!open) setDeleteUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteUser?.email}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
