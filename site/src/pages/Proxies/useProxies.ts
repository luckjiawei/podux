import { useState, useEffect, useCallback, useRef } from "react";
import pb from "../../lib/pocketbase";
import { apiPost } from "../../lib/api";
import { toast } from "sonner";

export interface Proxy {
  id: string;
  serverId: string;
  proxyType: "tcp" | "udp" | "http" | "https";
  name?: string;
  localIP?: string;
  localPort?: string;
  remotePort?: string;
  subdomain?: string;
  customDomains?: string[];
  transport?: Record<string, boolean>;
  description?: string;
  status: "enabled" | "disabled";
  bootStatus: "online" | "offline";
  created: string;
  updated: string;
}

export function useProxies() {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const initializedRef = useRef(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PER_PAGE = 10;

  const fetchProxies = useCallback(
    async (isRefresh = false) => {
      try {
        if (!initializedRef.current) {
          setLoading(true);
        } else if (isRefresh) {
          setRefreshing(true);
        }

        const result = await pb.collection("fh_proxies").getList<Proxy>(page, PER_PAGE, {
          sort: "-created",
          expand: "serverId",
        });
        setProxies(result.items);
        setTotalPages(result.totalPages);
        initializedRef.current = true;
      } catch (err) {
        if ((err as Record<string, unknown>)?.isAbort) return;
        toast.error(err instanceof Error ? err.message : "Failed to fetch proxies");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page]
  );

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchProxies(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchProxies]);

  const deleteProxy = async (id: string) => {
    const proxy = proxies.find((p) => p.id === id);
    try {
      await pb.collection("fh_proxies").delete(id);
      await fetchProxies();
      toast.success("Proxy deleted successfully");
      // Reload frp config if we know which server this proxy belonged to
      if (proxy?.serverId) {
        await apiPost("/api/frpc/reload", { id: proxy.serverId });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete proxy");
    }
  };

  const toggleStatus = async (proxy: Proxy) => {
    const newStatus = proxy.status === "enabled" ? "disabled" : "enabled";
    // Optimistic update
    setProxies((prev) =>
      prev.map((p) => (p.id === proxy.id ? { ...p, status: newStatus } : p))
    );
    try {
      await pb.collection("fh_proxies").update(proxy.id, { status: newStatus });
      // Reload frp config so the change takes effect immediately
      await apiPost("/api/frpc/reload", { id: proxy.serverId });
    } catch (err) {
      // Rollback on failure
      setProxies((prev) =>
        prev.map((p) => (p.id === proxy.id ? { ...p, status: proxy.status } : p))
      );
      toast.error(err instanceof Error ? err.message : "Failed to update proxy status");
    }
  };

  const stats = {
    total: proxies.length,
    online: proxies.filter((p) => p.bootStatus === "online").length,
    offline: proxies.filter((p) => p.bootStatus === "offline").length,
  };

  const isEmpty = !loading && proxies.length === 0;

  return {
    proxies,
    loading,
    refreshing,
    isEmpty,
    deleteProxy,
    toggleStatus,
    page,
    setPage,
    totalPages,
    stats,
    refreshProxies: () => fetchProxies(true),
  };
}
