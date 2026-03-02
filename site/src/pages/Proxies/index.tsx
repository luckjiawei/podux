import { useProxies } from "./useProxies";
import { ProxiesView } from "./ProxiesPage.view";

export function ProxiesPage() {
  const {
    proxies,
    loading,
    refreshing,
    stats,
    createProxy,
    updateProxy,
    deleteProxy,
    isDialogOpen,
    openDialog,
    closeDialog,
    editingProxy,
    refreshProxies,
  } = useProxies();

  return (
    <ProxiesView
      proxies={proxies as any}
      loading={loading}
      refreshing={refreshing}
      stats={stats}
      isDialogOpen={isDialogOpen}
      onOpenChange={(open) => (open ? openDialog() : closeDialog())}
      editingProxy={editingProxy as any}
      onCreateProxy={createProxy}
      onUpdateProxy={updateProxy}
      onDeleteProxy={deleteProxy}
      onEditClick={(proxy) => openDialog(proxy || undefined)}
      refreshProxies={refreshProxies}
    />
  );
}

export default ProxiesPage;
