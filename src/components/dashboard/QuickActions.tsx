import { Plus, FileText, HelpCircle, ClipboardList, Brain } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const quickActions = [
  {
    title: "Create TOS",
    description: "Build a new Table of Specifications",
    icon: FileText,
    variant: "gradient" as const,
    href: "/tos/create"
  },
  {
    title: "Add Questions",
    description: "Manually create new questions",
    icon: HelpCircle,
    variant: "secondary" as const,
    href: "/questions/create"
  },
  {
    title: "Generate Test",
    description: "Create a test from existing TOS",
    icon: ClipboardList,
    variant: "outline" as const,
    href: "/generator/create"
  },
  {
    title: "AI Assistant",
    description: "Generate questions with AI",
    icon: Brain,
    variant: "ghost" as const,
    href: "/ai-assistant"
  }
]

export function QuickActions() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Quick Actions</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.title}
                variant={action.variant}
                className="h-auto p-4 justify-start"
                asChild
              >
                <a href={action.href}>
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">{action.title}</div>
                      <div className="text-xs opacity-80">{action.description}</div>
                    </div>
                  </div>
                </a>
              </Button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}