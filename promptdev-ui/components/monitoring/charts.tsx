import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Area, AreaChart, CartesianGrid, XAxis, YAxis,
  Bar, BarChart,
  Pie, PieChart,
} from 'recharts'
import { Bot, TrendingUp, Wrench } from 'lucide-react'
import { PIE_COLORS } from './constants'

// ── Chart Configs ───────────────────────────────────────────────

const dailyOpsChartConfig: ChartConfig = {
  count: {
    label: 'Operations',
    color: 'hsl(var(--chart-1))',
  },
}

const toolsChartConfig: ChartConfig = {
  executionCount: {
    label: 'Executions',
    color: 'hsl(var(--chart-1))',
  },
}

// ── Charts ──────────────────────────────────────────────────────

export function DailyOperationsChart({ data }: Readonly<{ data: Array<{ date: string; count: number }> }>) {
  if (!data.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Daily Operations
        </CardTitle>
        <CardDescription>Operations over the selected time period</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={dailyOpsChartConfig} className="h-62.5 w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12, top: 12, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => value.slice(5)}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="count"
              type="monotone"
              fill="var(--color-count)"
              fillOpacity={0.3}
              stroke="var(--color-count)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function OperationsByTypeChart({ data }: Readonly<{ data: Record<string, number> }>) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null

  const chartConfig: ChartConfig = Object.fromEntries(
    entries.map(([key], index) => [
      key,
      { label: key.replaceAll('_', ' '), color: PIE_COLORS[index % PIE_COLORS.length] },
    ])
  )
  const chartData = entries.map(([name, value], index) => ({
    name,
    value,
    fill: PIE_COLORS[index % PIE_COLORS.length],
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Operations by Type
        </CardTitle>
        <CardDescription>Distribution of operation types</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-62.5 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
              labelLine={false}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function TopToolsChart({ tools }: Readonly<{ tools: Array<{ toolName: string; executionCount: number; avgDurationMs: number }> }>) {
  if (!tools.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Most Used Tools
        </CardTitle>
        <CardDescription>Tool execution count and average duration</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={toolsChartConfig} className="h-75 w-full">
          <BarChart
            accessibilityLayer
            data={tools}
            layout="vertical"
            margin={{ left: 80 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="toolName"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={70}
              tickFormatter={(value: string) =>
                value.length > 12 ? `${value.slice(0, 12)}...` : value
              }
            />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="executionCount" fill="var(--color-executionCount)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function SessionsByModelChart({ data }: Readonly<{ data: Record<string, number> }>) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null

  const chartConfig: ChartConfig = Object.fromEntries(
    entries.map(([key], index) => [
      key,
      { label: key, color: PIE_COLORS[index % PIE_COLORS.length] },
    ])
  )
  const chartData = entries.map(([name, value], index) => ({
    name,
    value,
    fill: PIE_COLORS[index % PIE_COLORS.length],
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Sessions by Model
        </CardTitle>
        <CardDescription>AI model usage distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-62.5 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              label
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
