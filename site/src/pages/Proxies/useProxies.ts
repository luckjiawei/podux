import { useState, useEffect, useCallback } from "react";
import pb from "../../lib/pocketbase";
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
  transport?: Record<string, any>;
  description?: string;
  status: "enabled" | "disabled";
  bootStatus: "online" | "offline";
  created: string;
  updated: string;
}

export interface CreateProxyForm {
  serverId: string;
  proxyType: "tcp" | "udp" | "http" | "https";
  name?: string;
  localIP?: string;
  localPort?: string;
  remotePort?: string;
  subdomain?: string;
  customDomains?: string[];
  transport?: Record<string, any>;
  description?: string;
}

export function useProxies() {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateProxyForm>({
    serverId: "",
    proxyType: "tcp",
    localIP: "127.0.0.1",
    localPort: "",
    remotePort: "",
    subdomain: "",
    customDomains: [],
    transport: {},
  });
  const [submitting, setSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PER_PAGE = 10;

  const [editingProxy, setEditingProxy] = useState<Proxy | null>(null);

  const fetchProxies = useCallback(
    async (isRefresh = false) => {
      try {
        // Only show loading spinner on initial load, not on refresh
        if (!isRefresh && proxies.length === 0) {
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
      } catch (err) {
        if ((err as any)?.isAbort) return;
        toast.error(err instanceof Error ? err.message : "Failed to fetch proxies");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, proxies.length]
  );

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  // Auto-refresh proxy status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProxies(true); // Pass true to indicate this is a refresh
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchProxies]);

  const openDialog = (proxy?: Proxy) => {
    if (proxy) {
      setEditingProxy(proxy);
    } else {
      setEditingProxy(null);
      setFormData({
        serverId: "",
        proxyType: "tcp",
        localIP: "127.0.0.1",
        localPort: "",
        remotePort: "",
        subdomain: "",
        customDomains: [],
        transport: {},
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProxy(null);
  };

  const updateFormField = (field: keyof CreateProxyForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const createProxy = async (data?: CreateProxyForm) => {
    try {
      setSubmitting(true);
      const body = data || formData;

      await pb.collection("fh_proxies").create(body);

      await fetchProxies();
      closeDialog();
      toast.success("Proxy created successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create proxy");
    } finally {
      setSubmitting(false);
    }
  };

  const updateProxy = async (id: string, data: CreateProxyForm) => {
    try {
      setSubmitting(true);

      await pb.collection("fh_proxies").update(id, data);

      await fetchProxies();
      closeDialog();
      toast.success("Proxy updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update proxy");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProxy = async (id: string) => {
    try {
      await pb.collection("fh_proxies").delete(id);
      await fetchProxies();
      toast.success("Proxy deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete proxy");
    }
  };

  const stats = {
    total: proxies.length,
    online: proxies.filter((p) => p.bootStatus === "online").length,
    offline: proxies.filter((p) => p.bootStatus === "offline").length,
    // tcp: proxies.filter((p) => p.proxyType === "tcp").length,
    // udp: proxies.filter((p) => p.proxyType === "udp").length,
    // http: proxies.filter((p) => p.proxyType === "http").length,
    // https: proxies.filter((p) => p.proxyType === "https").length,
  };

  const isEmpty = !loading && proxies.length === 0;

  return {
    proxies,
    loading,
    refreshing,
    isEmpty,
    isDialogOpen,
    formData,
    submitting,
    editingProxy,
    openDialog,
    closeDialog,
    updateFormField,
    createProxy,
    updateProxy,
    deleteProxy,
    page,
    setPage,
    totalPages,
    stats,
    refreshProxies: () => fetchProxies(true),
  };
}
