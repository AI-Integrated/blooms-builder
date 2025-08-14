import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Brain, FileCheck, LogOut } from "lucide-react";
import { auth } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";

const stats = [
  {
    name: "Total Questions",
    value: "156",
    description: "Questions in database",
    icon: BookOpen,
  },
  {
    name: "Tests Created",
    value: "12",
    description: "Generated tests",
    icon: FileCheck,
  },
  {
    name: "AI Classifications",
    value: "89%",
    description: "Accuracy rate",
    icon: Brain,
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    auth.logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your question bank and test generation stats.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.name} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;