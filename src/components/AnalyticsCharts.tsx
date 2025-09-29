import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Analytics } from "@/services/db/analytics";

const BLOOM_COLORS = {
  "Remembering": "hsl(var(--primary))",
  "remembering": "hsl(var(--primary))",
  "Understanding": "hsl(var(--secondary))", 
  "understanding": "hsl(var(--secondary))", 
  "Applying": "hsl(var(--accent))",
  "applying": "hsl(var(--accent))",
  "Analyzing": "hsl(var(--primary-glow))",
  "analyzing": "hsl(var(--primary-glow))",
  "Evaluating": "hsl(var(--muted))",
  "evaluating": "hsl(var(--muted))",
  "Creating": "hsl(var(--destructive))",
  "creating": "hsl(var(--destructive))",
  "Unknown": "hsl(var(--muted-foreground))"
};

const CREATOR_COLORS = {
  "AI Generated": "hsl(var(--primary))",
  "Teacher Created": "hsl(var(--secondary))"
};

const DIFFICULTY_COLORS = {
  "Easy": "hsl(var(--secondary))",
  "easy": "hsl(var(--secondary))",
  "Average": "hsl(var(--primary))",
  "average": "hsl(var(--primary))",
  "Difficult": "hsl(var(--destructive))",
  "difficult": "hsl(var(--destructive))",
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
  const [analytics, setAnalytics] = useState<{
    bloomDistribution: Array<{name: string; value: number; percentage: number}>;
    creatorStats: Array<{name: string; value: number}>;
    timeSeriesData: Array<{date: string; count: number}>;
    difficultySpread: Array<{name: string; value: number; percentage: number}>;
    usageStats: Array<{name: string; value: number; percentage: number}>;
    approvalStats: Array<{name: string; value: number}>;
    topicAnalysis: Array<{topic: string; questionCount: number; approvalRate: number}>;
    totalQuestions: number;
    aiQuestions: number;
    teacherQuestions: number;
    approvedQuestions: number;
    pendingApproval: number;
    loading: boolean;
  }>({
    bloomDistribution: [],
    creatorStats: [],
    timeSeriesData: [],
    difficultySpread: [],
    usageStats: [],
    approvalStats: [],
    topicAnalysis: [],
    totalQuestions: 0,
    aiQuestions: 0,
    teacherQuestions: 0,
    approvedQuestions: 0,
    pendingApproval: 0,
    loading: true,
  });

  useEffect(() => {
    loadAnalytics();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('analytics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions'
        },
        () => {
          loadAnalytics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_log'
        },
        () => {
          loadAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAnalytics = async () => {
    try {
      const [
        bloomData,
        difficultyData,
        creatorData,
        usageData,
        approvalData,
        topicData
      ] = await Promise.all([
        Analytics.bloomDistribution(),
        Analytics.difficultySpread(),
        Analytics.creatorStats(),
        Analytics.usageOverTime(),
        Analytics.approvalStats(),
        Analytics.topicAnalysis()
      ]);

      const totalQuestions = bloomData.reduce((sum, item) => sum + item.value, 0);
      const aiQuestions = creatorData.find(item => item.name === 'AI Generated')?.value || 0;
      const teacherQuestions = creatorData.find(item => item.name === 'Teacher Created')?.value || 0;
      const approvedQuestions = approvalData.find(item => item.name === 'Approved')?.value || 0;
      const pendingApproval = approvalData.find(item => item.name === 'Pending Review')?.value || 0;

      // Transform topic analysis data
      const topicAnalysis = topicData.slice(0, 10).map((item) => ({
        topic: item.topic,
        questionCount: item.count,
        approvalRate: item.count > 0 ? Math.round((item.approved / item.count) * 100) : 0
      }));

      // Calculate usage stats (mock for now until we have real usage tracking)
      const usageStats = [
        { name: 'Used in Tests', value: Math.floor(totalQuestions * 0.6), percentage: 60 },
        { name: 'Unused', value: Math.floor(totalQuestions * 0.4), percentage: 40 }
      ];

      setAnalytics({
        bloomDistribution: bloomData,
        creatorStats: creatorData,
        timeSeriesData: usageData,
        difficultySpread: difficultyData,
        usageStats,
        approvalStats: approvalData,
        topicAnalysis,
        totalQuestions,
        aiQuestions,
        teacherQuestions,
        approvedQuestions,
        pendingApproval,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      setAnalytics(prev => ({ ...prev, loading: false }));
    }
  };

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

        {/* System Activity Over Time */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Usage Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.timeSeriesData.length > 0 ? (
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
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <p className="font-medium">{label}</p>
                            <p className="text-sm text-muted-foreground">
                              {payload[0].value} activities
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Topic Analysis */}
      {analytics.topicAnalysis.length > 0 && (
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Topics by Question Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="max-h-[400px]">
              <BarChart data={analytics.topicAnalysis} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="topic" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  width={120}
                />
                <Bar 
                  dataKey="questionCount" 
                  radius={[0, 4, 4, 0]}
                  fill="hsl(var(--primary))"
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-md">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm text-muted-foreground">
                            {payload[0].value} questions ({payload[0].payload?.approvalRate}% approved)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsCharts;