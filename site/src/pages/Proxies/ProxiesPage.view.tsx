import { Icon } from "@iconify/react";
import { Badge, Button, Card, Flex, Table, Text, TextField, AlertDialog } from "@radix-ui/themes";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { EmptyState } from "../../components/EmptyState";
import { AddProxyDialog, type ProxyFormData } from "./AddProxyDialog";
import { type Proxy } from "./useProxies";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { useTranslation } from "react-i18next";

interface ProxiesViewProps {
  proxies: Proxy[];
  loading: boolean;
  refreshing: boolean;
  stats: {
    total: number;
    online: number;
    offline: number;
  };
  isDialogOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingProxy: Proxy | null;
  onCreateProxy: (data: any) => Promise<void>;
  onUpdateProxy: (id: string, data: any) => Promise<void>;
  onDeleteProxy: (id: string) => Promise<void>;
  onEditClick: (proxy: Proxy | null) => void;
  refreshProxies: () => void;
}

export function ProxiesView({
  proxies,
  loading: _loading,
  refreshing,
  stats,
  isDialogOpen,
  onOpenChange,
  editingProxy,
  onCreateProxy,
  onUpdateProxy,
  onDeleteProxy,
  onEditClick,
  refreshProxies,
}: ProxiesViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleAction = async (data: ProxyFormData) => {
    const payload = {
      serverId: data.serverId,
      proxyType: data.type,
      name: data.name,
      localIP: data.localIp,
      localPort: data.localPort,
      remotePort: data.remotePort,
      subdomain: data.subdomain,
      customDomains: data.customDomains ? data.customDomains.split(",").map((d) => d.trim()) : [],
      transport: {
        use_encryption: data.encryption,
        use_compression: data.compression,
      },
      description: data.description,
      status: "enabled",
    };

    if (editingProxy) {
      await onUpdateProxy(editingProxy.id, payload);
    } else {
      await onCreateProxy(payload);
    }
  };

  const initialFormData: ProxyFormData | null = editingProxy
    ? {
        serverId: (editingProxy as any).serverId,
        name: editingProxy.name || "",
        type: (editingProxy as any).proxyType as any,
        localIp: (editingProxy as any).localIP || "127.0.0.1",
        localPort: String(editingProxy.localPort || ""),
        remotePort: String(editingProxy.remotePort || ""),
        subdomain: (editingProxy as any).subdomain || "",
        customDomains: (editingProxy as any).customDomains?.join(", ") || "",
        encryption: (editingProxy as any).transport?.use_encryption || false,
        compression: (editingProxy as any).transport?.use_compression || false,
        description: (editingProxy as any).description || "",
      }
    : null;

  return (
    <>
      <AddProxyDialog
        open={isDialogOpen}
        onOpenChange={onOpenChange}
        onSubmit={handleAction}
        initialData={initialFormData}
      />

      <Flex direction="column" gap="5" className="flex flex-1 flex-col">
        {/* Header */}
        <PageHeader
          title={t("proxy.title")}
          description={t("proxy.manageProxies")}
          visible={mounted}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            <StatCard
              title={t("proxy.totalProxies")}
              value={stats.total}
              color="gray"
              icon={<Icon icon="lucide:network" width="32" height="32" color="var(--gray-11)" />}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            <StatCard
              title={t("proxy.online")}
              value={<span className="text-[#30A46C]">{stats.online}</span>}
              color="green"
              icon={
                <Icon icon="lucide:check-circle" width="32" height="32" color="var(--green-11)" />
              }
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          >
            <StatCard
              title={t("proxy.offline")}
              value={<span className="text-[#E5484D]">{stats.offline}</span>}
              color="red"
              icon={<Icon icon="lucide:x-circle" width="32" height="32" color="var(--red-11)" />}
            />
          </motion.div>
        </div>

        {/* Proxies Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <Card className="flex flex-1 flex-col">
            <Flex direction="column" gap="3" mb="4" p="2">
              <Flex justify="between" align="center" wrap="wrap" gap="2">
                <Text size="3" weight="bold">
                  {t("proxy.allProxies")}
                </Text>
                <Flex gap="2" wrap="wrap" align="center">
                  <TextField.Root
                    size="2"
                    placeholder={t("proxy.searchProxies")}
                    className="min-w-32 flex-1"
                  >
                    <TextField.Slot>
                      <Icon icon="lucide:search" width="16" height="16" />
                    </TextField.Slot>
                  </TextField.Root>
                  <Button variant="soft" onClick={refreshProxies} disabled={refreshing}>
                    <Icon
                      icon="lucide:refresh-cw"
                      width="14"
                      height="14"
                      className={refreshing ? "animate-spin" : ""}
                    />
                    {t("proxy.refresh")}
                  </Button>
                  <Button variant="soft" color="gray" onClick={() => navigate("/import")}>
                    <Icon icon="lucide:file-input" width="16" height="16" />
                    {t("nav.import")}
                  </Button>
                  <Button onClick={() => onEditClick(null)}>
                    <Icon icon="lucide:plus" width="16" height="16" />
                    {t("proxy.addProxy")}
                  </Button>
                </Flex>
              </Flex>
            </Flex>

            {proxies.length === 0 ? (
              <EmptyState
                title={t("proxy.noProxies")}
                description={t("proxy.addFirstProxy")}
                actionText={t("proxy.createYourFirstProxy")}
                onAction={() => onEditClick(null)}
              />
            ) : (
              <div className="overflow-x-auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>{t("common.name")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("common.type")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("proxy.server")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("proxy.localIP")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("proxy.localPort")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("proxy.remotePortOrDomain")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("proxy.bootStatus")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("common.status")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("common.actions")}</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {proxies.map((proxy) => (
                    <Table.Row key={proxy.id}>
                      <Table.Cell>
                        <Text weight="medium">{proxy.name}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant="surface">{proxy.proxyType.toUpperCase()}</Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {(proxy as any).expand?.serverId ? (
                          <Link
                            to={`/servers/${(proxy as any).serverId}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Text size="2" color="blue" style={{ cursor: "pointer" }}>
                              {(proxy as any).expand.serverId.serverName}
                            </Text>
                          </Link>
                        ) : (
                          <Text size="2" color="gray">
                            -
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {(proxy as any).localIP || "127.0.0.1"}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>{proxy.localPort}</Table.Cell>
                      <Table.Cell>
                        {(() => {
                          const p = proxy as any;
                          if (proxy.proxyType === "http" || proxy.proxyType === "https") {
                            const serverAddr = p.expand?.serverId?.serverAddr || "";
                            const items: string[] = [];
                            if (p.subdomain) items.push(`${p.subdomain}.${serverAddr}`);
                            if (p.customDomains?.length > 0) items.push(...p.customDomains);
                            if (items.length === 0) return <Text size="2" color="gray">-</Text>;
                            return (
                              <Flex direction="column" gap="1">
                                {items.map((domain: string, i: number) => {
                                  const copyKey = `${proxy.id}-domain-${i}`;
                                  const isCopied = copiedId === copyKey;
                                  return (
                                    <Flex
                                      key={i}
                                      align="center"
                                      gap="1"
                                      style={{ cursor: "pointer" }}
                                      onClick={() => handleCopy(domain, copyKey)}
                                      title={isCopied ? t("common.copied") : t("common.clickToCopy")}
                                    >
                                      <Text size="2">{domain}</Text>
                                      <Icon
                                        icon={isCopied ? "lucide:check" : "lucide:copy"}
                                        width="12"
                                        height="12"
                                        color={isCopied ? "var(--green-9)" : "var(--gray-8)"}
                                      />
                                    </Flex>
                                  );
                                })}
                              </Flex>
                            );
                          }
                          const displayText = proxy.remotePort || "-";
                          if (displayText === "-") return <Text size="2" color="gray">-</Text>;
                          const copyKey = `${proxy.id}-port`;
                          const isCopied = copiedId === copyKey;
                          return (
                            <Flex
                              align="center"
                              gap="1"
                              style={{ cursor: "pointer" }}
                              onClick={() => handleCopy(displayText, copyKey)}
                              title={isCopied ? t("common.copied") : t("common.clickToCopy")}
                            >
                              <Text size="2">{displayText}</Text>
                              <Icon
                                icon={isCopied ? "lucide:check" : "lucide:copy"}
                                width="12"
                                height="12"
                                color={isCopied ? "var(--green-9)" : "var(--gray-8)"}
                              />
                            </Flex>
                          );
                        })()}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          radius="full"
                          color={proxy.bootStatus === "online" ? "green" : "red"}
                          className={`animate-status-appear ${
                            proxy.bootStatus === "online"
                              ? "animate-status-pulse"
                              : "animate-status-fade"
                          }`}
                        >
                          <span
                            className={`status-dot ${
                              proxy.bootStatus === "online" ? "status-dot-green" : "status-dot-red"
                            }`}
                          />
                          {proxy.bootStatus === "online" ? t("proxy.online") : t("proxy.offline")}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={proxy.status === "enabled" ? "green" : "red"}>
                          {proxy.status === "enabled" ? t("proxy.enabled") : t("proxy.disabled")}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Flex gap="2">
                          <Button size="1" variant="soft" onClick={() => onEditClick(proxy)}>
                            <Icon icon="lucide:pencil" width="14" height="14" />
                            {t("common.edit")}
                          </Button>
                          <Button
                            size="1"
                            variant="soft"
                            color="red"
                            onClick={() => setDeleteId(proxy.id)}
                          >
                            <Icon icon="lucide:trash-2" width="14" height="14" />
                            {t("common.delete")}
                          </Button>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
              </div>
            )}
          </Card>
        </motion.div>
      </Flex>

      <AlertDialog.Root open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>{t("proxy.confirmDeletion")}</AlertDialog.Title>
          <AlertDialog.Description size="2">
            {t("proxy.deleteConfirmMessage")}
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                <Icon icon="lucide:x" width="16" height="16" />
                {t("common.cancel")}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                variant="solid"
                color="red"
                onClick={() => {
                  if (deleteId) {
                    onDeleteProxy(deleteId);
                    setDeleteId(null);
                  }
                }}
              >
                <Icon icon="lucide:trash-2" width="16" height="16" />
                {t("common.delete")}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}
