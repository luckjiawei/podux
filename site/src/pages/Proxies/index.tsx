import { useProxies } from "./useProxies";
import { ProxiesView } from "./ProxiesPage.view";

export function ProxiesPage() {
  const { proxies, loading, refreshing, stats, deleteProxy, refreshProxies } = useProxies();

  return (
    <ProxiesView
      proxies={proxies}
      loading={loading}
      refreshing={refreshing}
      stats={stats}
      onDeleteProxy={deleteProxy}
      refreshProxies={refreshProxies}
    />
  );
}

export default ProxiesPage;
