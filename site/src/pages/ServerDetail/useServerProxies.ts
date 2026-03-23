import { useState, useEffect, useCallback, useRef } from "react";
import pb from "../../lib/pocketbase";
import { apiPost } from "../../lib/api";
import { toast } from "sonner";
import type { Proxy } from "../Proxies/useProxies";

export function useServerProxies(serverId: string | undefined) {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchProxies = useCallback(async (isManual = false) => {
    if (!serverId) return;
    if (isManual) setRefreshing(true);
    try {
      const result = await pb.collection("fh_proxies").getFullList<Proxy>({
        filter: `serverId = "${serverId}"`,
        sort: "-created",
      });
      if (!mountedRef.current) return;
      setProxies(result);
    } catch (err) {
      if (!mountedRef.current) return;
      if ((err as Record<string, unknown>)?.isAbort) return;
      toast.error(err instanceof Error ? err.message : "Failed to fetch proxies");
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  // Auto-refresh every 5s to keep bootStatus in sync
  useEffect(() => {
    const interval = setInterval(fetchProxies, 5000);
    return () => clearInterval(interval);
  }, [fetchProxies]);

  const toggleStatus = async (proxy: Proxy) => {
    if (togglingId === proxy.id) return;
    const newStatus = proxy.status === "enabled" ? "disabled" : "enabled";
    setProxies((prev) =>
      prev.map((p) => (p.id === proxy.id ? { ...p, status: newStatus } : p))
    );
    setTogglingId(proxy.id);
    try {
      await pb.collection("fh_proxies").update(proxy.id, { status: newStatus });
      if (serverId) await apiPost("/api/frpc/reload", { id: serverId });
    } catch (err) {
      setProxies((prev) =>
        prev.map((p) => (p.id === proxy.id ? { ...p, status: proxy.status } : p))
      );
      toast.error(err instanceof Error ? err.message : "Failed to update proxy status");
    } finally {
      setTogglingId(null);
    }
  };

  const deleteProxy = async (id: string) => {
    try {
      await pb.collection("fh_proxies").delete(id);
      setProxies((prev) => prev.filter((p) => p.id !== id));
      toast.success("Proxy deleted successfully");
      if (serverId) await apiPost("/api/frpc/reload", { id: serverId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete proxy");
    }
  };

  return { proxies, loading, refreshing, togglingId, toggleStatus, deleteProxy, refresh: () => fetchProxies(true) };
}
