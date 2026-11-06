import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import pb from "../../../lib/pocketbase";
import { apiGet } from "../../../lib/api";
import { toast } from "sonner";
import { REGEX } from "../../../lib/regex";

export interface ProxyFormData {
  serverId: string;
  name: string;
  type: "tcp" | "udp" | "http" | "https" | "tcpmux" | "stcp" | "sudp" | "xtcp";
  localIp: string;
  localPort: string;
  remotePort: string;
  customDomains: string[];
  subdomain: string;
  encryption: boolean;
  compression: boolean;
  description: string;
  pluginEnabled: boolean;
  pluginType: "socks5";
  pluginUsername: string;
  pluginPassword: string;
  secretKey: string;
  allowUsers: string[];
  disableAssistedAddrs: boolean;
}

const DEFAULT_FORM: ProxyFormData = {
  serverId: "",
  name: "",
  type: "tcp",
  localIp: "127.0.0.1",
  localPort: "",
  remotePort: "",
  customDomains: [],
  subdomain: "",
  encryption: false,
  compression: false,
  description: "",
  pluginEnabled: false,
  pluginType: "socks5",
  pluginUsername: "",
  pluginPassword: "",
  secretKey: "",
  allowUsers: [],
  disableAssistedAddrs: false,
};

export interface ServerOption {
  id: string;
  serverName: string;
  bootStatus: string;
  networkStatus?: {
    latency: number;
    reachable: boolean;
  };
}

export function useProxyForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { t } = useTranslation();

  const [formData, setFormData] = useState<ProxyFormData>(DEFAULT_FORM);
  const [servers, setServers] = useState<ServerOption[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [loadingProxy, setLoadingProxy] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProxyFormData, string>>>({});

  useEffect(() => {
    const fetchServers = async () => {
      try {
        setLoadingServers(true);
        const res = await apiGet("/api/servers/options");
        if (!res.ok) throw new Error("Failed to fetch servers");
        const list: ServerOption[] = await res.json();
        setServers(list);
        if (list.length > 0 && !isEditing) {
          setFormData((prev) => ({ ...prev, serverId: list[0].id }));
        }
      } catch (err) {
        console.error("Failed to fetch servers:", err);
        toast.error("Failed to fetch servers");
      } finally {
        setLoadingServers(false);
      }
    };
    fetchServers();
  }, [isEditing]);

  useEffect(() => {
    if (!id) return;
    const fetchProxy = async () => {
      try {
        setLoadingProxy(true);
        const record = await pb.collection("fh_proxies").getOne(id);
        const plugin = record.plugin as Record<string, string> | null | undefined;
        setFormData({
          serverId: record.serverId as string,
          name: (record.name as string) || "",
          type: record.proxyType as ProxyFormData["type"],
          localIp: (record.localIP as string) || "127.0.0.1",
          localPort: String(record.localPort || ""),
          remotePort: String(record.remotePort || ""),
          subdomain: (record.subdomain as string) || "",
          customDomains: (record.customDomains as string[] | undefined) || [],
          encryption:
            (record.transport as Record<string, boolean> | undefined)?.useEncryption ||
            (record.transport as Record<string, boolean> | undefined)?.use_encryption ||
            false,
          compression:
            (record.transport as Record<string, boolean> | undefined)?.useCompression ||
            (record.transport as Record<string, boolean> | undefined)?.use_compression ||
            false,
          description: (record.description as string) || "",
          pluginEnabled: !!plugin?.type,
          pluginType: (plugin?.type as ProxyFormData["pluginType"]) || "socks5",
          pluginUsername: plugin?.username || "",
          pluginPassword: plugin?.password || "",
          secretKey: (record.secretKey as string) || "",
          allowUsers: (record.allowUsers as string[] | undefined) || [],
          disableAssistedAddrs: !!(record.natTraversal as Record<string, boolean> | undefined)
            ?.disableAssistedAddrs,
        });
      } catch {
        toast.error("Failed to load proxy");
        navigate("/proxies");
      } finally {
        setLoadingProxy(false);
      }
    };
    fetchProxy();
  }, [id, navigate]);

  const validateField = (field: keyof ProxyFormData, value: string) => {
    let error = "";
    if (value) {
      switch (field) {
        case "name":
          if (!REGEX.PROXY_NAME.test(value)) error = t("proxy.errorInvalidName");
          break;
        case "localIp":
          if (!REGEX.IP_OR_HOSTNAME.test(value)) error = t("proxy.errorInvalidIP");
          break;
        case "localPort":
        case "remotePort":
          if (!REGEX.PORT.test(value)) error = t("proxy.errorInvalidPort");
          break;
      }
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: keyof ProxyFormData, value: string | boolean | string[]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (
        field === "type" &&
        value !== "tcp" &&
        prev.pluginEnabled &&
        prev.pluginType === "socks5"
      ) {
        next.pluginEnabled = false;
      }
      return next;
    });
    if (typeof value === "string") validateField(field, value);
    if (Array.isArray(value) && field === "customDomains") {
      setErrors((prev) => ({ ...prev, customDomains: undefined }));
    }
  };

  const validate = (data: ProxyFormData): boolean => {
    const isHttp = data.type === "http" || data.type === "https";
    const isSocks5 = data.pluginEnabled && data.pluginType === "socks5";
    const newErrors: Partial<Record<keyof ProxyFormData, string>> = {};

    if (!data.serverId) newErrors.serverId = t("proxy.errorRequired");
    if (!data.name) newErrors.name = t("proxy.errorRequired");
    else if (!REGEX.PROXY_NAME.test(data.name)) newErrors.name = t("proxy.errorInvalidName");

    if (!isSocks5) {
      if (!data.localIp) newErrors.localIp = t("proxy.errorRequired");
      else if (!REGEX.IP_OR_HOSTNAME.test(data.localIp))
        newErrors.localIp = t("proxy.errorInvalidIP");

      if (!data.localPort) newErrors.localPort = t("proxy.errorRequired");
      else if (!REGEX.PORT.test(data.localPort)) newErrors.localPort = t("proxy.errorInvalidPort");
    }

    if (!isHttp && data.type !== "xtcp" && !isSocks5) {
      if (!data.remotePort) newErrors.remotePort = t("proxy.errorRequired");
      else if (!REGEX.PORT.test(data.remotePort))
        newErrors.remotePort = t("proxy.errorInvalidPort");
    }

    if (isHttp && !data.subdomain && data.customDomains.length === 0) {
      newErrors.subdomain = t("proxy.errorSubdomainRequired");
    }

    if (data.type === "xtcp" && !data.secretKey) {
      newErrors.secretKey = t("proxy.errorRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate(formData)) return;

    const plugin = formData.pluginEnabled
      ? {
          type: formData.pluginType,
          ...(formData.pluginUsername ? { username: formData.pluginUsername } : {}),
          ...(formData.pluginPassword ? { password: formData.pluginPassword } : {}),
        }
      : null;

    const payload = {
      serverId: formData.serverId,
      proxyType: formData.type,
      name: formData.name,
      localIP: formData.localIp,
      localPort: formData.localPort,
      remotePort: formData.type === "xtcp" ? "" : formData.remotePort,
      subdomain: formData.subdomain,
      customDomains: formData.customDomains,
      transport: {
        useEncryption: formData.encryption,
        useCompression: formData.compression,
      },
      plugin,
      secretKey: formData.type === "xtcp" ? formData.secretKey : "",
      allowUsers: formData.type === "xtcp" ? formData.allowUsers.filter(Boolean) : [],
      natTraversal:
        formData.type === "xtcp" ? { disableAssistedAddrs: formData.disableAssistedAddrs } : {},
      description: formData.description,
      status: "enabled",
    };

    try {
      setSubmitting(true);
      if (isEditing) {
        await pb.collection("fh_proxies").update(id!, payload);
        toast.success("Proxy updated successfully");
      } else {
        await pb.collection("fh_proxies").create({ bootStatus: "offline", ...payload });
        toast.success("Proxy created successfully");
      }
      navigate("/proxies");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save proxy");
    } finally {
      setSubmitting(false);
    }
  };

  const isHttpType = formData.type === "http" || formData.type === "https";
  const isXtcpType = formData.type === "xtcp";
  const isSocks5Plugin = formData.pluginEnabled && formData.pluginType === "socks5";

  return {
    isEditing,
    formData,
    servers,
    loadingServers,
    loadingProxy,
    submitting,
    errors,
    isHttpType,
    isXtcpType,
    isSocks5Plugin,
    handleChange,
    handleSubmit,
    navigate,
  };
}
