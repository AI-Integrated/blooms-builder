import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { 
  Brain, 
  BarChart3, 
  BookOpen, 
  Target,
  CheckCircle,
  Clock
} from "lucide-react";

interface AnalyticsData {
  bloomDistribution: Array<{ name: string; value: number; color: string }>;
  difficultyDistribution: Array<{ name: string; value: number; color: string }>;
  topicDistribution: Array<{ topic: string; count: number }>;
}

const COLORS = {
  bloom: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#e74c3c', '#9b59b6'],
  difficulty: ['#2ecc71', '#f39c12', '#e74c3c']
};

export function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    approvedQuestions: 0,
    totalTests: 0,
    avgConfidence: 0
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*');

      if (questionsError) throw questionsError;

      const { data: tests, error: testsError } = await supabase
        .from('generated_tests')
        .select('created_at');

      if (testsError) throw testsError;

      // Process Bloom's level distribution
      const bloomCounts = questions?.reduce((acc: Record<string, number>, q) => {
        acc[q.bloom_level] = (acc[q.bloom_level] || 0) + 1;
        return acc;
      }, {}) || {};

      const bloomDistribution = Object.entries(bloomCounts).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: value as number,
        color: COLORS.bloom[index % COLORS.bloom.length]
      }));

      // Process difficulty distribution
      const difficultyCounts = questions?.reduce((acc: Record<string, number>, q) => {
        acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
        return acc;
      }, {}) || {};

      const difficultyDistribution = Object.entries(difficultyCounts).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: value as number,
        color: COLORS.difficulty[index % COLORS.difficulty.length]
      }));

      // Process topic distribution
      const topicCounts = questions?.reduce((acc: Record<string, number>, q) => {
        acc[q.topic] = (acc[q.topic] || 0) + 1;
        return acc;
      }, {}) || {};

      const topicDistribution = Object.entries(topicCounts)
        .map(([topic, count]) => ({ topic, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate stats
      const totalQuestions = questions?.length || 0;
      const approvedQuestions = questions?.filter(q => q.approved).length || 0;
      const totalTests = tests?.length || 0;
      const avgConfidence = questions?.length ? 
        questions.reduce((sum, q) => sum + (q.ai_confidence_score || 0), 0) / questions.length : 0;

      setData({
        bloomDistribution,
        difficultyDistribution,
        topicDistribution
      });

      setStats({
        totalQuestions,
        approvedQuestions,
        totalTests,
        avgConfidence
      });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Questions</p>
                <p className="text-2xl font-bold">{stats.totalQuestions}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approvedQuestions}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tests Generated</p>
                <p className="text-2xl font-bold">{stats.totalTests}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg AI Confidence</p>
                <p className="text-2xl font-bold">{Math.round(stats.avgConfidence * 100)}%</p>
              </div>
              <Brain className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloom's Taxonomy Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Bloom's Taxonomy Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data?.bloomDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data?.bloomDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Difficulty Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Difficulty Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.difficultyDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {data?.difficultyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}