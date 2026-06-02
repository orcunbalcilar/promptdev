import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: Readonly<{
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
}>) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="bg-primary/10 p-3 rounded-full">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend === 'up' && (
          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
            <TrendingUp className="h-3 w-3" />
            <span>Increasing</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
