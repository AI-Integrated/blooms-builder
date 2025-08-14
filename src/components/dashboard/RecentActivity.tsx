import { Clock, FileText, HelpCircle, ClipboardList, User } from "lucide-react"
import { Card } from "@/components/ui/card"

const activities = [
  {
    id: 1,
    type: "tos_created",
    title: "Mathematics TOS created",
    description: "Grade 10 Algebra - 50 items",
    time: "2 hours ago",
    icon: FileText,
    user: "You"
  },
  {
    id: 2,
    type: "question_added",
    title: "5 questions added",
    description: "Applied level questions in Quadratic Equations",
    time: "4 hours ago",
    icon: HelpCircle,
    user: "Sarah Johnson"
  },
  {
    id: 3,
    type: "test_generated",
    title: "Science Test generated",
    description: "Biology - 40 items with answer key",
    time: "6 hours ago",
    icon: ClipboardList,
    user: "Michael Chen"
  },
  {
    id: 4,
    type: "tos_updated",
    title: "English TOS updated",
    description: "Added Reading Comprehension topics",
    time: "1 day ago",
    icon: FileText,
    user: "You"
  },
  {
    id: 5,
    type: "question_reviewed",
    title: "Questions reviewed",
    description: "Approved 12 AI-generated questions",
    time: "1 day ago",
    icon: HelpCircle,
    user: "Dr. Williams"
  }
]

const typeStyles = {
  tos_created: "bg-primary/10 text-primary",
  tos_updated: "bg-primary/10 text-primary",
  question_added: "bg-success/10 text-success",
  question_reviewed: "bg-success/10 text-success",
  test_generated: "bg-accent/10 text-accent"
}

export function RecentActivity() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </div>
        
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = activity.icon
            return (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className={`p-2 rounded-lg ${typeStyles[activity.type as keyof typeof typeStyles]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-sm">{activity.title}</h4>
                    <span className="text-xs text-muted-foreground shrink-0">{activity.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{activity.user}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}