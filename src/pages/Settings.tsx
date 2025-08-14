
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  return (
    <div className="animate-slide-up space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and application preferences.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="test-notifications">Test notifications</Label>
              <Switch id="test-notifications" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-updates">AI classification updates</Label>
              <Switch id="ai-updates" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-classify">
                Automatic question classification
              </Label>
              <Switch id="auto-classify" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
