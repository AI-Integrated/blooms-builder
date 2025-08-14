
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="mb-4 text-4xl font-bold">AI Text Bank</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        Welcome to AI Text Bank, your intelligent solution for test questionnaire
        generation and management.
      </p>
      <div className="space-x-4">
        <Button size="lg" onClick={() => navigate("/login")}>
          Login
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
          Get Started
        </Button>
      </div>
    </div>
  );
}
