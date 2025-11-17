import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';

interface PsychometricTrendsProps {
  data: {
    dates: string[];
    cronbachAlpha: number[];
    splitHalf: number[];
  };
}

export const PsychometricTrends: React.FC<PsychometricTrendsProps> = ({ data }) => {
  const chartData = data.dates.map((date, index) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cronbach: data.cronbachAlpha[index],
    splitHalf: data.splitHalf[index]
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reliability Trends Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            cronbach: { 
              label: "Cronbach's Alpha", 
              color: "hsl(var(--primary))" 
            },
            splitHalf: { 
              label: "Split-Half Reliability", 
              color: "hsl(var(--chart-2))" 
            }
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="cronbachGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="splitHalfGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                domain={[0.7, 1]} 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="cronbach"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#cronbachGradient)"
                name="Cronbach's Alpha"
              />
              <Area
                type="monotone"
                dataKey="splitHalf"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                fill="url(#splitHalfGradient)"
                name="Split-Half"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
