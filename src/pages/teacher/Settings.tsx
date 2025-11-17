import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input id="institution" placeholder="University Name" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose how you want to be notified</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch id="email-notifications" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="test-reminders">Test Reminders</Label>
                <p className="text-sm text-muted-foreground">Get reminded about upcoming tests</p>
              </div>
              <Switch id="test-reminders" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="ai-suggestions">AI Suggestions</Label>
                <p className="text-sm text-muted-foreground">Receive AI-powered recommendations</p>
              </div>
              <Switch id="ai-suggestions" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Generation Defaults</CardTitle>
            <CardDescription>Set your preferred test generation settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultDifficulty">Default Difficulty</Label>
              <Input id="defaultDifficulty" placeholder="Medium" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultQuestions">Default Number of Questions</Label>
              <Input id="defaultQuestions" type="number" placeholder="20" />
            </div>
            <Button variant="outline">Reset to Defaults</Button>
          </CardContent>
        </Card>
      </div>
  );
}
