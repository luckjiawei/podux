import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  Select,
  Separator,
  Switch,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { Icon } from "@iconify/react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import pb from "../../lib/pocketbase";
import { PageHeader } from "../../components/PageHeader";
import { FormItem } from "../../components/FormItem";
import { REGEX } from "../../lib/regex";

interface ServerRecord {
  id: string;
  serverName: string;
  serverAddr: string;
  serverPort: number;
}
interface ProxyRecord {
  id: string;
  name: string;
  serverId: string;
  secretKey?: string;
  expand?: { serverId?: ServerRecord };
}

const defaults = {
  name: "",
  serverId: "",
  targetMode: "managed" as "managed" | "external",
  targetProxyId: "",
  serverUser: "",
  serverName: "",
  secretKey: "",
  bindAddr: "127.0.0.1",
  bindPort: "",
  protocol: "quic" as "quic" | "kcp",
  encryption: false,
  compression: false,
  keepTunnelOpen: false,
  maxRetriesAnHour: "8",
  minRetryInterval: "90",
  disableAssistedAddrs: false,
  description: "",
  status: "enabled" as "enabled" | "disabled",
};

export function VisitorFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState(defaults);
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [targets, setTargets] = useState<ProxyRecord[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      pb.collection("fh_servers").getFullList<ServerRecord>({ sort: "serverName" }),
      pb
        .collection("fh_proxies")
        .getFullList<ProxyRecord>({
          filter: 'proxyType = "xtcp"',
          sort: "name",
          expand: "serverId",
        }),
    ])
      .then(([serverRecords, proxyRecords]) => {
        setServers(serverRecords);
        setTargets(proxyRecords);
        if (!id && serverRecords.length)
          setForm((prev) => ({ ...prev, serverId: serverRecords[0].id }));
      })
      .catch(() => toast.error(t("visitor.loadFailed")));
  }, [id, t]);

  useEffect(() => {
    if (!id) return;
    pb.collection("fh_visitors")
      .getOne(id)
      .then((record) => {
        const transport = record.transport as Record<string, boolean> | undefined;
        setForm({
          name: String(record.name || ""),
          serverId: String(record.serverId || ""),
          targetMode: record.targetProxyId ? "managed" : "external",
          targetProxyId: String(record.targetProxyId || ""),
          serverUser: String(record.serverUser || ""),
          serverName: String(record.serverName || ""),
          secretKey: String(record.secretKey || ""),
          bindAddr: String(record.bindAddr || "127.0.0.1"),
          bindPort: String(record.bindPort || ""),
          protocol: (record.protocol as "quic" | "kcp") || "quic",
          encryption: !!(transport?.useEncryption || transport?.use_encryption),
          compression: !!(transport?.useCompression || transport?.use_compression),
          keepTunnelOpen: !!record.keepTunnelOpen,
          maxRetriesAnHour: String(record.maxRetriesAnHour || 8),
          minRetryInterval: String(record.minRetryInterval || 90),
          disableAssistedAddrs: !!(record.natTraversal as Record<string, boolean> | undefined)
            ?.disableAssistedAddrs,
          description: String(record.description || ""),
          status: (record.status as "enabled" | "disabled") || "enabled",
        });
      })
      .catch(() => {
        toast.error(t("visitor.loadFailed"));
        navigate("/visitors");
      });
  }, [id, navigate, t]);

  const selectedServer = servers.find((server) => server.id === form.serverId);
  const compatibleTargets = useMemo(
    () =>
      targets.filter((target) => {
        const server = target.expand?.serverId;
        return (
          !!selectedServer &&
          server?.serverAddr === selectedServer.serverAddr &&
          Number(server?.serverPort) === Number(selectedServer.serverPort)
        );
      }),
    [targets, selectedServer]
  );

  const set = <K extends keyof typeof defaults>(key: K, value: (typeof defaults)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (
      !form.name ||
      !REGEX.PROXY_NAME.test(form.name) ||
      !form.serverId ||
      !form.bindPort ||
      Number(form.bindPort) === 0
    ) {
      toast.error(t("visitor.validationFailed"));
      return;
    }
    if (form.targetMode === "managed" && !form.targetProxyId) {
      toast.error(t("visitor.targetRequired"));
      return;
    }
    if (form.targetMode === "external" && (!form.serverName || !form.secretKey)) {
      toast.error(t("visitor.externalRequired"));
      return;
    }
    const payload = {
      name: form.name,
      visitorType: "xtcp",
      serverId: form.serverId,
      targetProxyId: form.targetMode === "managed" ? form.targetProxyId : "",
      serverUser: form.targetMode === "external" ? form.serverUser : "",
      serverName: form.targetMode === "external" ? form.serverName : "",
      secretKey: form.targetMode === "external" ? form.secretKey : "",
      bindAddr: form.bindAddr || "127.0.0.1",
      bindPort: form.bindPort,
      protocol: form.protocol,
      transport: { useEncryption: form.encryption, useCompression: form.compression },
      keepTunnelOpen: form.keepTunnelOpen,
      maxRetriesAnHour: form.keepTunnelOpen ? Number(form.maxRetriesAnHour) || 8 : 8,
      minRetryInterval: form.keepTunnelOpen ? Number(form.minRetryInterval) || 90 : 90,
      natTraversal: { disableAssistedAddrs: form.disableAssistedAddrs },
      description: form.description,
      status: form.status,
    };
    try {
      setSaving(true);
      if (id) await pb.collection("fh_visitors").update(id, payload);
      else await pb.collection("fh_visitors").create(payload);
      toast.success(t("visitor.saved"));
      navigate("/visitors");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("visitor.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Flex direction="column" gap="5">
      <PageHeader
        title={id ? t("visitor.editVisitor") : t("visitor.addVisitor")}
        description={t("visitor.formDescription")}
        visible
      />
      <Card>
        <Flex direction="column" gap="5">
          <FormItem label={t("common.name")} required>
            <TextField.Root value={form.name} onChange={(e) => set("name", e.target.value)} />
          </FormItem>
          <FormItem label={t("visitor.client")} required>
            <Select.Root
              value={form.serverId}
              onValueChange={(v) => {
                set("serverId", v);
                set("targetProxyId", "");
              }}
            >
              <Select.Trigger style={{ width: "100%" }} />
              <Select.Content>
                {servers.map((s) => (
                  <Select.Item key={s.id} value={s.id}>
                    {s.serverName} ({s.serverAddr}:{s.serverPort})
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </FormItem>
          <Separator size="4" />
          <FormItem label={t("visitor.targetMode")}>
            <Select.Root
              value={form.targetMode}
              onValueChange={(v) => set("targetMode", v as "managed" | "external")}
            >
              <Select.Trigger style={{ width: "100%" }} />
              <Select.Content>
                <Select.Item value="managed">{t("visitor.managedTarget")}</Select.Item>
                <Select.Item value="external">{t("visitor.externalTarget")}</Select.Item>
              </Select.Content>
            </Select.Root>
          </FormItem>
          {form.targetMode === "managed" ? (
            <FormItem label={t("visitor.target")} required>
              <Select.Root
                value={form.targetProxyId}
                onValueChange={(v) => set("targetProxyId", v)}
              >
                <Select.Trigger placeholder={t("visitor.selectTarget")} style={{ width: "100%" }} />
                <Select.Content>
                  {compatibleTargets.map((p) => (
                    <Select.Item key={p.id} value={p.id}>
                      {p.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              {compatibleTargets.length === 0 && (
                <Text size="1" color="orange">
                  {t("visitor.noCompatibleTargets")}
                </Text>
              )}
            </FormItem>
          ) : (
            <>
              <FormItem label={t("visitor.serverUser")}>
                <TextField.Root
                  value={form.serverUser}
                  onChange={(e) => set("serverUser", e.target.value)}
                />
              </FormItem>
              <FormItem label={t("visitor.serverName")} required>
                <TextField.Root
                  value={form.serverName}
                  onChange={(e) => set("serverName", e.target.value)}
                />
              </FormItem>
              <FormItem label={t("proxy.xtcpSecretKey")} required>
                <TextField.Root
                  type="password"
                  value={form.secretKey}
                  onChange={(e) => set("secretKey", e.target.value)}
                />
              </FormItem>
            </>
          )}
          <Separator size="4" />
          <Flex gap="3">
            <Box className="flex-[2]">
              <FormItem label={t("visitor.bindAddr")} required>
                <TextField.Root
                  value={form.bindAddr}
                  onChange={(e) => set("bindAddr", e.target.value)}
                />
              </FormItem>
            </Box>
            <Box className="flex-1">
              <FormItem label={t("visitor.bindPort")} required>
                <TextField.Root
                  type="number"
                  value={form.bindPort}
                  onChange={(e) => set("bindPort", e.target.value)}
                />
              </FormItem>
            </Box>
          </Flex>
          <FormItem label={t("visitor.protocol")}>
            <Select.Root
              value={form.protocol}
              onValueChange={(v) => set("protocol", v as "quic" | "kcp")}
            >
              <Select.Trigger style={{ width: "100%" }} />
              <Select.Content>
                <Select.Item value="quic">QUIC</Select.Item>
                <Select.Item value="kcp">KCP</Select.Item>
              </Select.Content>
            </Select.Root>
          </FormItem>
          {(
            [
              ["encryption", "proxy.transportEncryption"],
              ["compression", "proxy.dataCompression"],
              ["disableAssistedAddrs", "proxy.xtcpDisableAssisted"],
              ["keepTunnelOpen", "visitor.keepTunnelOpen"],
            ] as const
          ).map(([key, label]) => (
            <Flex key={key} justify="between" align="center">
              <Text>{t(label)}</Text>
              <Switch checked={form[key]} onCheckedChange={(v) => set(key, v)} />
            </Flex>
          ))}
          {form.keepTunnelOpen && (
            <Flex gap="3">
              <Box className="flex-1">
                <FormItem label={t("visitor.maxRetries")}>
                  <TextField.Root
                    type="number"
                    value={form.maxRetriesAnHour}
                    onChange={(e) => set("maxRetriesAnHour", e.target.value)}
                  />
                </FormItem>
              </Box>
              <Box className="flex-1">
                <FormItem label={t("visitor.minRetryInterval")}>
                  <TextField.Root
                    type="number"
                    value={form.minRetryInterval}
                    onChange={(e) => set("minRetryInterval", e.target.value)}
                  />
                </FormItem>
              </Box>
            </Flex>
          )}
          <FormItem label={t("common.description")}>
            <TextArea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </FormItem>
          <Flex justify="end" gap="3">
            <Button variant="soft" color="gray" onClick={() => navigate("/visitors")}>
              <Icon icon="lucide:arrow-left" />
              {t("common.cancel")}
            </Button>
            <Button disabled={saving} onClick={save}>
              <Icon icon="lucide:save" />
              {saving ? t("proxy.saving") : t("common.save")}
            </Button>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}

export default VisitorFormPage;
