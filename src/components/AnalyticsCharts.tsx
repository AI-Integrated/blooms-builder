import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { 
  BarChart3, 
  PieChart as PieIcon, 
  TrendingUp, 
  Brain, 
  CheckCircle, 
  Clock, 
  Target,
  Activity
} from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";

const BLOOM_COLORS = {
  "Remembering": "hsl(var(--primary))",
  "Understanding": "hsl(var(--secondary))", 
  "Applying": "hsl(var(--accent))",
  "Analyzing": "hsl(var(--primary-glow))",
  "Evaluating": "hsl(var(--muted))",
  "Creating": "hsl(var(--destructive))",
  "Unknown": "hsl(var(--muted-foreground))"
};

const CREATOR_COLORS = {
  "AI Generated": "hsl(var(--primary))",
  "Teacher Created": "hsl(var(--secondary))"
};

const DIFFICULTY_COLORS = {
  "Easy": "hsl(var(--secondary))",
  "Average": "hsl(var(--primary))",
  "Hard": "hsl(var(--destructive))",
  "Unknown": "hsl(var(--muted-foreground))"
};

const APPROVAL_COLORS = {
  "Approved": "hsl(var(--secondary))",
  "Pending Review": "hsl(var(--primary))"
};

const USAGE_COLORS = {
  "Used in Tests": "hsl(var(--primary))",
  "Unused": "hsl(var(--muted))"
};

export const AnalyticsCharts = () => {
  const analytics = useAnalytics();

  if (analytics.loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
    mobile: {
      label: "Mobile", 
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              In question bank
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Generated</CardTitle>
            <Brain className="h-4 w-4 text-primary-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.aiQuestions}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalQuestions > 0 
                ? Math.round((analytics.aiQuestions / analytics.totalQuestions) * 100)
                : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teacher Created</CardTitle>
            <TrendingUp className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.teacherQuestions}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalQuestions > 0 
                ? Math.round((analytics.teacherQuestions / analytics.totalQuestions) * 100)
                : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Questions</CardTitle>
            <CheckCircle className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.approvedQuestions}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.pendingApproval} pending review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Primary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloom's Distribution Pie Chart */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="h-5 w-5" />
              Bloom's Taxonomy Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.bloomDistribution.length > 0 ? (
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[300px]"
              >
                <PieChart>
                  <Pie
                    data={analytics.bloomDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {analytics.bloomDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={BLOOM_COLORS[entry.name as keyof typeof BLOOM_COLORS] || BLOOM_COLORS.Unknown}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {data.name}
                                </span>
                                <span className="font-bold text-muted-foreground">
                                  {data.value} questions ({data.percentage}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Creator Stats */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Question Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.creatorStats.length > 0 ? (
              <ChartContainer config={chartConfig} className="max-h-[300px]">
                <BarChart data={analytics.creatorStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]}
                    fill="hsl(var(--primary))"
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <p className="font-medium">{label}</p>
                            <p className="text-sm text-muted-foreground">
                              {payload[0].value} questions
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Difficulty Distribution */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Difficulty Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.difficultySpread.length > 0 ? (
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[300px]"
              >
                <PieChart>
                  <Pie
                    data={analytics.difficultySpread}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {analytics.difficultySpread.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={DIFFICULTY_COLORS[entry.name as keyof typeof DIFFICULTY_COLORS] || DIFFICULTY_COLORS.Unknown}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {data.name}
                                </span>
                                <span className="font-bold text-muted-foreground">
                                  {data.value} questions ({data.percentage}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Status */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Approval Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.approvalStats.length > 0 ? (
              <ChartContainer config={chartConfig} className="max-h-[300px]">
                <BarChart data={analytics.approvalStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]}
                    fill="hsl(var(--secondary))"
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <p className="font-medium">{label}</p>
                            <p className="text-sm text-muted-foreground">
                              {payload[0].value} questions
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Analysis */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Topic Analysis (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topicAnalysis.length > 0 ? (
              <ChartContainer config={chartConfig} className="max-h-[300px]">
                <BarChart data={analytics.topicAnalysis} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    dataKey="topic" 
                    type="category" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    width={80}
                  />
                  <Bar 
                    dataKey="questionCount" 
                    radius={[0, 4, 4, 0]}
                    fill="hsl(var(--accent))"
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <p className="font-medium">{label}</p>
                            <p className="text-sm text-muted-foreground">
                              {payload[0].value} questions
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Question Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.usageStats.length > 0 ? (
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[300px]"
              >
                <PieChart>
                  <Pie
                    data={analytics.usageStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {analytics.usageStats.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={USAGE_COLORS[entry.name as keyof typeof USAGE_COLORS] || "hsl(var(--muted))"}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {data.name}
                                </span>
                                <span className="font-bold text-muted-foreground">
                                  {data.value} questions ({data.percentage}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      {analytics.timeSeriesData.length > 0 && (
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Question Creation Over Time (Last 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="max-h-[300px]">
              <LineChart data={analytics.timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-md">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm text-muted-foreground">
                            {payload[0].value} questions created
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};