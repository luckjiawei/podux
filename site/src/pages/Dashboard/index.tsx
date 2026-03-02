import { DashboardView } from "./DashboardPage.view";
import { useDashboard } from "./useDashboard";

export function DashboardPage() {
  // @ts-ignore
  const { stats, activities, trafficHistory, topology, loading } = useDashboard();

  return (
    <DashboardView
      stats={stats}
      activities={activities}
      trafficHistory={trafficHistory}
      topology={topology}
      loading={loading}
    />
  );
}
