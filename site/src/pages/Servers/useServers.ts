import { useState, useEffect, useCallback } from "react";
import pb from "../../lib/pocketbase";
import { toast } from "sonner";

export interface Server {
  id: string;
  serverName: string;
  serverAddr: string;
  serverPort: number;
  description: string;
  bootStatus: string;
  autoConnection: boolean;
  created: string;
  updated: string;
  sendRate: number;
  recvRate: number;
  // Network status
  networkStatus?: {
    latency: number;
    reachable: boolean;
    lastCheckTime: string;
    error?: string;
  };
  geoLocation?: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    isp: string;
    lat: number;
    lon: number;
  };
  // Extended fields
  log?: {
    level: "trace" | "debug" | "info" | "warn" | "error";
    maxDays: number;
    to?: string;
  };
  auth?: {
    method: "none" | "token" | "oidc";
    token: string;
    oidcClientId: string;
    oidcClientSecret: string;
    oidcAudience: string;
    oidcTokenEndpoint: string;
  };
  transport?: {
    protocol: "tcp" | "kcp" | "quic" | "websocket" | "wss";
    tls: {
      enable: boolean;
      disableCustomTLSFirstByte: boolean;
      certFile: string;
      keyFile: string;
      trustedCaFile: string;
      serverName: string;
    };
    proxyURL: string;
  };
  metadatas?: Record<string, string>;
}

export interface CreateServerForm {
  serverName: string;
  serverAddr: string;
  serverPort: number;
  description: string;
  autoConnection: boolean;
  auth: {
    method: "none" | "token" | "oidc";
    token: string;
    oidcClientId: string;
    oidcClientSecret: string;
    oidcAudience: string;
    oidcTokenEndpoint: string;
  };
  log?: {
    level: "trace" | "debug" | "info" | "warn" | "error";
    maxDays: number;
    to?: string;
  };
  transport?: {
    protocol: "tcp" | "kcp" | "quic" | "websocket" | "wss";
    tls: {
      enable: boolean;
      disableCustomTLSFirstByte: boolean;
      certFile: string;
      keyFile: string;
      trustedCaFile: string;
      serverName: string;
    };
    proxyURL: string;
  };
  metadatas?: Record<string, string>;
}

export function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateServerForm>({
    serverName: "",
    serverAddr: "",
    serverPort: 7000,
    description: "",
    autoConnection: false,
    auth: {
      method: "token",
      token: "",
      oidcClientId: "",
      oidcClientSecret: "",
      oidcAudience: "",
      oidcTokenEndpoint: "",
    },
  });
  const [submitting, setSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PER_PAGE = 10;

  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [search, setSearch] = useState("");

  const fetchServers = useCallback(
    async (isRefresh = false) => {
      try {
        // Only show loading spinner on initial load, not on refresh
        if (!isRefresh && servers.length === 0) {
          setLoading(true);
        } else if (isRefresh) {
          setRefreshing(true);
        }

        const options: any = {
          sort: "-created",
        };

        if (search) {
          options.filter = `serverName ~ "${search}" || serverAddr ~ "${search}" || description ~ "${search}"`;
        }

        const result = await pb.collection("fh_servers").getList<Server>(page, PER_PAGE, options);

        // Network status is already stored in database, no need to fetch separately
        setServers(result.items);
        setTotalPages(result.totalPages);
      } catch (err) {
        if ((err as any)?.isAbort) return;
        toast.error(err instanceof Error ? err.message : "Failed to fetch servers");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, servers.length]
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServers();
    }, 300); // Simple debounce
    return () => clearTimeout(timer);
  }, [fetchServers]);

  // Auto-refresh server status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchServers(true); // Pass true to indicate this is a refresh
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchServers]);

  const openDialog = (server?: Server) => {
    if (server) {
      setEditingServer(server);
      // Pre-fill form data if we were using the hook's state, but we're seemingly not.
      // But we might need to if we want the hook's formData to match.
      // However, the View doesn't seem to use hook's formData for the dialog anymore.
      // We will let the Dialog handle its own state based on editingServer prop.
    } else {
      setEditingServer(null);
      setFormData({
        serverName: "",
        serverAddr: "",
        serverPort: 7000,
        description: "",
        autoConnection: false,
        auth: {
          method: "token",
          token: "",
          oidcClientId: "",
          oidcClientSecret: "",
          oidcAudience: "",
          oidcTokenEndpoint: "",
        },
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingServer(null);
  };

  const updateFormField = (field: keyof CreateServerForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const createServer = async (data?: CreateServerForm) => {
    try {
      setSubmitting(true);
      const body = data || formData;
      // Ensure port is a number
      const payload = {
        ...body,
        serverPort: Number(body.serverPort),
        bootStatus: "stopped", // Default status
      };

      await pb.collection("fh_servers").create(payload);

      await fetchServers();
      closeDialog();
      toast.success("Server created successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create server");
    } finally {
      setSubmitting(false);
    }
  };

  const updateServer = async (id: string, data: CreateServerForm) => {
    try {
      setSubmitting(true);
      // Ensure port is a number
      const payload = {
        ...data,
        serverPort: Number(data.serverPort),
      };

      await pb.collection("fh_servers").update(id, payload);

      await fetchServers();
      closeDialog();
      toast.success("Server updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update server");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteServer = async (id: string) => {
    try {
      await pb.collection("fh_servers").delete(id);
      await fetchServers();
      toast.success("Server deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete server");
    }
  };

  const launchServer = async (id: string) => {
    console.log("launching server", id);
    const response = await fetch("/api/frpc/launch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    if (response.ok) {
      await fetchServers();
      toast.success("Server launched successfully");
    }
  };

  const terminateServer = async (id: string) => {
    console.log("terminating server", id);
    const response = await fetch("/api/frpc/terminate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    if (response.ok) {
      await fetchServers();
      toast.success("Server launched successfully");
    }
  };

  return {
    servers,
    loading,
    refreshing,
    isDialogOpen,
    formData,
    submitting,
    editingServer,
    openDialog,
    closeDialog,
    updateFormField,
    createServer,
    updateServer,
    deleteServer,
    page,
    setPage,
    totalPages,
    launchServer,
    terminateServer,
    search,
    setSearch,
    refreshServers: () => fetchServers(true),
  };
}
