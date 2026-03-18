import AnalyticsCharts from '@/components/AnalyticsCharts';

export default function Analytics() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">System Analytics</h1>
        <p className="text-muted-foreground">
          Overview of system-wide usage and performance metrics
        </p>
      </div>

      <AnalyticsCharts />
    </div>
  );
}
