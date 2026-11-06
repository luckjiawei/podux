import { useCallback, useEffect, useState } from "react";
import pb from "../../lib/pocketbase";
import { toast } from "sonner";

export interface Visitor {
  id: string;
  name: string;
  visitorType: "xtcp";
  serverId: string;
  targetProxyId?: string;
  serverName?: string;
  bindAddr: string;
  bindPort: string;
  protocol: "quic" | "kcp";
  status: "enabled" | "disabled";
  expand?: {
    serverId?: { serverName?: string; bootStatus?: string };
    targetProxyId?: { name?: string };
  };
}

export function useVisitors() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const records = await pb.collection("fh_visitors").getFullList<Visitor>({
        sort: "-created",
        expand: "serverId,targetProxyId",
      });
      setVisitors(records);
    } catch (err) {
      if ((err as Record<string, unknown>)?.isAbort) return;
      toast.error(err instanceof Error ? err.message : "Failed to load visitors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = async (visitor: Visitor) => {
    const status = visitor.status === "enabled" ? "disabled" : "enabled";
    await pb.collection("fh_visitors").update(visitor.id, { status });
    await refresh();
  };

  const remove = async (id: string) => {
    await pb.collection("fh_visitors").delete(id);
    await refresh();
  };

  return { visitors, loading, refresh, toggle, remove };
}
