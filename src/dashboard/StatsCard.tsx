import { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  gradient?: boolean
}

export function StatsCard({ title, value, description, icon: Icon, trend, gradient }: StatsCardProps) {
  return (
    <Card className={`p-6 ${gradient ? 'bg-gradient-primary text-primary-foreground' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className={`text-sm font-medium ${gradient ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            {title}
          </p>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className={`text-sm ${gradient ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {description}
              </p>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-lg ${gradient ? 'bg-white/20' : 'bg-accent'}`}>
          <Icon className={`w-6 h-6 ${gradient ? 'text-white' : 'text-accent-foreground'}`} />
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${
            trend.isPositive 
              ? gradient ? 'bg-white/20 text-white' : 'bg-success/10 text-success'
              : gradient ? 'bg-white/20 text-white' : 'bg-destructive/10 text-destructive'
          }`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
          <span className={`text-xs ${gradient ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            vs last month
          </span>
        </div>
      )}
    </Card>
  )
}