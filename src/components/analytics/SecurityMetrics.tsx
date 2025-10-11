import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, CheckCircle, AlertCircle } from 'lucide-react';

interface RoleDistribution {
  role: string;
  count: number;
}

interface MetricsSummary {
  totalUsers: number;
  roleDistribution: RoleDistribution[];
  recentValidations: number;
  pendingReviews: number;
}

export function SecurityMetrics() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      // Get role distribution
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role');

      if (rolesError) throw rolesError;

      const distribution = roles?.reduce((acc, { role }) => {
        const existing = acc.find(r => r.role === role);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ role, count: 1 });
        }
        return acc;
      }, [] as RoleDistribution[]) || [];

      // Get validation stats
      const { count: validationsCount } = await supabase
        .from('classification_validations')
        .select('*', { count: 'exact', head: true });

      // Get pending reviews
      const { count: reviewsCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('needs_review', true);

      setMetrics({
        totalUsers: roles?.length || 0,
        roleDistribution: distribution,
        recentValidations: validationsCount || 0,
        pendingReviews: reviewsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching security metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading metrics...</p>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'validator':
        return 'default';
      case 'teacher':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalUsers}</div>
          <p className="text-xs text-muted-foreground">Active user accounts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Role Distribution</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {metrics.roleDistribution.map(({ role, count }) => (
              <Badge key={role} variant={getRoleBadgeVariant(role)}>
                {role}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Validations</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.recentValidations}</div>
          <p className="text-xs text-muted-foreground">Total classifications validated</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.pendingReviews}</div>
          <p className="text-xs text-muted-foreground">Questions awaiting review</p>
        </CardContent>
      </Card>
    </div>
  );
}
