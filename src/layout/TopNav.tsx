
import { Bell, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export function TopNav() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/");
  };

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-full items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">AI Text Bank</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
