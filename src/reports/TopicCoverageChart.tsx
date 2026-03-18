import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface TopicData {
  topic: string;
  count: number;
  percentage: number;
}

const COLORS = [
  'hsl(217, 91%, 60%)',  // Primary blue
  'hsl(262, 80%, 50%)',  // Secondary purple
  'hsl(142, 76%, 40%)',  // Accent green
  'hsl(38, 92%, 50%)',   // Orange
  'hsl(348, 83%, 47%)',  // Red
  'hsl(187, 85%, 43%)',  // Cyan
  'hsl(291, 64%, 42%)',  // Magenta
  'hsl(24, 100%, 50%)',  // Deep Orange
];

export function TopicCoverageChart() {
  const [topicData, setTopicData] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopicData();
  }, []);

  const fetchTopicData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to view topic coverage');
        return;
      }

      // Fetch generated tests for the current user
      const { data: tests, error: testsError } = await supabase
        .from('generated_tests')
        .select('items')
        .eq('created_by', user.id);

      if (testsError) throw testsError;

      // Aggregate topic counts from all test items
      const topicCounts: Record<string, number> = {};
      let totalQuestions = 0;

      (tests || []).forEach(test => {
        const items = Array.isArray(test.items) ? test.items : [];
        items.forEach((item: any) => {
          const topic = item.topic || item.subject || 'Uncategorized';
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          totalQuestions++;
        });
      });

      // Convert to array and calculate percentages
      const data: TopicData[] = Object.entries(topicCounts)
        .map(([topic, count]) => ({
          topic,
          count,
          percentage: totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // Top 8 topics

      setTopicData(data);
    } catch (err) {
      console.error('Error fetching topic data:', err);
      setError('Failed to load topic coverage data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {error}
      </div>
    );
  }

  if (topicData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
        <p className="mb-2">No topic data available yet</p>
        <p className="text-sm">Generate tests to see topic distribution</p>
      </div>
    );
  }

  const totalQuestions = topicData.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing distribution across {topicData.length} topics ({totalQuestions} total questions)
        </p>
      </div>

      <Tabs defaultValue="pie" className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="pie">Pie Chart</TabsTrigger>
          <TabsTrigger value="bar">Bar Chart</TabsTrigger>
        </TabsList>

        <TabsContent value="pie" className="mt-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topicData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="topic"
                  label={({ topic, percentage }) => `${percentage}%`}
                >
                  {topicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [`${value} questions`, name]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  formatter={(value) => <span className="text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="bar" className="mt-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={topicData} 
                layout="vertical"
                margin={{ left: 100, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="topic" 
                  width={90}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} questions`, 'Count']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(217, 91%, 60%)" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>

      {/* Topic breakdown cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {topicData.slice(0, 4).map((topic, index) => (
          <Card key={topic.topic} className="p-3">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">{topic.topic}</p>
                <p className="font-semibold text-sm">{topic.count} <span className="text-muted-foreground font-normal">({topic.percentage}%)</span></p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
