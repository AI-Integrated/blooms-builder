import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { QualityCharacteristic } from '@/services/quality/iso25010Evaluator';

interface QualityMetricsChartProps {
  characteristics: QualityCharacteristic[];
}

export const QualityMetricsChart: React.FC<QualityMetricsChartProps> = ({ characteristics }) => {
  const radarData = characteristics.map(char => ({
    characteristic: char.name.split(' ')[0], // Shortened names for radar
    score: char.score * 100,
    fullName: char.name
  }));

  const barData = characteristics.map(char => ({
    name: char.name,
    score: Math.round(char.score * 100)
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Quality Characteristics Radar</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              score: { label: "Score", color: "hsl(var(--primary))" }
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis 
                  dataKey="characteristic" 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Radar 
                  name="Quality Score" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.3}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quality Scores Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              score: { label: "Score (%)", color: "hsl(var(--primary))" }
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={barData}
                layout="vertical"
                margin={{ left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="score" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
