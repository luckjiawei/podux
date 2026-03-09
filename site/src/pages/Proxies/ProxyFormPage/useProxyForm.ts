import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import pb from "../../../lib/pocketbase";
import { toast } from "sonner";
import { REGEX } from "../../../lib/regex";

export interface ProxyFormData {
  serverId: string;
  name: string;
  type: "tcp" | "udp" | "http" | "https" | "stcp" | "xtcp";
  localIp: string;
  localPort: string;
  remotePort: string;
  customDomains: string;
  subdomain: string;
  encryption: boolean;
  compression: boolean;
  description: string;
}

const DEFAULT_FORM: ProxyFormData = {
  serverId: "",
  name: "",
  type: "tcp",
  localIp: "127.0.0.1",
  localPort: "",
  remotePort: "",
  customDomains: "",
  subdomain: "",
  encryption: false,
  compression: false,
  description: "",
};

export function useProxyForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [formData, setFormData] = useState<ProxyFormData>(DEFAULT_FORM);
  const [servers, setServers] = useState<{ id: string; serverName: string }[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [loadingProxy, setLoadingProxy] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProxyFormData, string>>>({});

  useEffect(() => {
    const fetchServers = async () => {
      try {
        setLoadingServers(true);
        const records = await pb.collection("fh_servers").getFullList({
          sort: "-created",
          fields: "id,serverName",
        });
        const list = records.map((r) => ({ id: r.id, serverName: r.serverName as string }));
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
        setFormData({
          serverId: record.serverId as string,
          name: (record.name as string) || "",
          type: record.proxyType as ProxyFormData["type"],
          localIp: (record.localIP as string) || "127.0.0.1",
          localPort: String(record.localPort || ""),
          remotePort: String(record.remotePort || ""),
          subdomain: (record.subdomain as string) || "",
          customDomains: (record.customDomains as string[] | undefined)?.join(", ") || "",
          encryption: (record.transport as Record<string, boolean> | undefined)?.use_encryption || false,
          compression: (record.transport as Record<string, boolean> | undefined)?.use_compression || false,
          description: (record.description as string) || "",
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
          if (!REGEX.PROXY_NAME.test(value)) error = "Invalid proxy name";
          break;
        case "localIp":
          if (!REGEX.IP_OR_HOSTNAME.test(value)) error = "Invalid IP or hostname";
          break;
        case "localPort":
        case "remotePort":
          if (!REGEX.PORT.test(value)) error = "Invalid port number";
          break;
      }
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: keyof ProxyFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (typeof value === "string") validateField(field, value);
  };

  const handleSubmit = async () => {
    const payload = {
      serverId: formData.serverId,
      proxyType: formData.type,
      name: formData.name,
      localIP: formData.localIp,
      localPort: formData.localPort,
      remotePort: formData.remotePort,
      subdomain: formData.subdomain,
      customDomains: formData.customDomains
        ? formData.customDomains.split(",").map((d) => d.trim()).filter(Boolean)
        : [],
      transport: {
        use_encryption: formData.encryption,
        use_compression: formData.compression,
      },
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

  const isSubmitDisabled =
    !formData.serverId ||
    !formData.name ||
    !formData.type ||
    !formData.localIp ||
    !formData.localPort ||
    (!isHttpType && !formData.remotePort) ||
    (isHttpType && !formData.subdomain && !formData.customDomains) ||
    !!errors.name ||
    !!errors.localIp ||
    !!errors.localPort ||
    (!isHttpType && !!errors.remotePort) ||
    submitting;

  return {
    isEditing,
    formData,
    servers,
    loadingServers,
    loadingProxy,
    submitting,
    errors,
    isHttpType,
    isSubmitDisabled,
    handleChange,
    handleSubmit,
    navigate,
  };
}
