import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">System Settings</h1>
            <p className="text-muted-foreground">
              Configure system-wide preferences and settings
            </p>
          </div>
          <Badge variant="outline">Administrator</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Profile</CardTitle>
            <CardDescription>Your administrator account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="Admin Name" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>Global system settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-approval">Automatic Question Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Auto-approve high-confidence AI questions
                </p>
              </div>
              <Switch id="auto-approval" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="semantic-check">Semantic Redundancy Check</Label>
                <p className="text-sm text-muted-foreground">
                  Enable AI-powered duplicate detection
                </p>
              </div>
              <Switch id="semantic-check" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="usage-tracking">Usage Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Track question usage across tests
                </p>
              </div>
              <Switch id="usage-tracking" defaultChecked />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="confidence-threshold">AI Confidence Threshold</Label>
              <Input
                id="confidence-threshold"
                type="number"
                min="0"
                max="1"
                step="0.01"
                placeholder="0.85"
              />
              <p className="text-xs text-muted-foreground">
                Minimum confidence score for AI-generated content (0-1)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>System alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pending-notifications">Pending Approval Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when questions await approval
                </p>
              </div>
              <Switch id="pending-notifications" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="system-alerts">System Health Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts about system issues
                </p>
              </div>
              <Switch id="system-alerts" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Maintenance</CardTitle>
            <CardDescription>Database optimization and cleanup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Archive Old Tests</p>
                <p className="text-sm text-muted-foreground">
                  Archive tests older than 1 year
                </p>
              </div>
              <Button variant="outline">Run Archive</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Cleanup Rejected Questions</p>
                <p className="text-sm text-muted-foreground">
                  Remove permanently rejected questions
                </p>
              </div>
              <Button variant="outline">Clean Up</Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
