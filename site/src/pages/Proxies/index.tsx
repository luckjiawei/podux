import { useProxies } from "./useProxies";
import { ProxiesView } from "./ProxiesPage.view";

export function ProxiesPage() {
  const { proxies, loading, refreshing, stats, deleteProxy, toggleStatus, refreshProxies, page, setPage, totalPages, search, setSearch } = useProxies();

  return (
    <ProxiesView
      proxies={proxies}
      loading={loading}
      refreshing={refreshing}
      stats={stats}
      onDeleteProxy={deleteProxy}
      onToggleStatus={toggleStatus}
      refreshProxies={refreshProxies}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
      search={search}
      setSearch={setSearch}
    />
  );
}

export default ProxiesPage;
