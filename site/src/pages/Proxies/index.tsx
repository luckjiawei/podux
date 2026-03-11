import { useProxies } from "./useProxies";
import { ProxiesView } from "./ProxiesPage.view";

export function ProxiesPage() {
  const { proxies, loading, refreshing, stats, deleteProxy, toggleStatus, refreshProxies } = useProxies();

  return (
    <ProxiesView
      proxies={proxies}
      loading={loading}
      refreshing={refreshing}
      stats={stats}
      onDeleteProxy={deleteProxy}
      onToggleStatus={toggleStatus}
      refreshProxies={refreshProxies}
    />
  );
}

export default ProxiesPage;
