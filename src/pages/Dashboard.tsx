import DashboardLayout from '@/components/DashboardLayout';
import ActionGrid from '@/components/ActionGrid';

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record observations and track relational patterns with clarity.
          </p>
        </div>

        <ActionGrid />

        <div className="border border-border rounded-sm p-6">
          <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-4">
            Recent Activity
          </h2>
          <p className="text-sm text-muted-foreground">
            No observations logged yet. Start by logging your first observation.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
