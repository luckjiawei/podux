import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Flex, Text, Badge, Grid, Button, Heading, Box, Table, AlertDialog } from "@radix-ui/themes";
import { Icon } from "@iconify/react";
import { PageHeader } from "../../components/PageHeader";
import { Loading } from "../../components/Loading";
import pb from "../../lib/pocketbase";
import type { Server } from "../Servers/useServers";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ServerLatency } from "../../components/ServerLatency";
import { ServerLocation } from "../../components/ServerLocation";
import { useTranslation } from "react-i18next";
import { useServerProxies } from "./useServerProxies";
import { apiPost } from "../../lib/api";

export function ServerDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [deleteProxyId, setDeleteProxyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { proxies, togglingId, toggleStatus, deleteProxy, refreshing, refresh } = useServerProxies(id);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  useEffect(() => {
    // Wait for PageTransition to complete before triggering animations
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const [actionLoading, setActionLoading] = useState(false);

  const fetchServer = useCallback(async (showLoading = true) => {
    if (!id) return;
    try {
      if (showLoading) setLoading(true);
      const record = await pb.collection("fh_servers").getOne<Server>(id);
      setServer(record);
    } catch (err: any) {
      if (err.isAbort) return;
      console.error("Failed to load server details:", err);
      setError(err.message || t("server.failedToLoad"));
      toast.error(t("server.failedToLoad"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchServer();
  }, [fetchServer]);

  const handleStart = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const response = await apiPost("/api/frpc/launch", { id });
      if (response.ok) {
        toast.success(t("server.startSuccess"));
        fetchServer(false);
      } else {
        toast.error(t("server.startFailed"));
      }
    } catch (err: any) {
      toast.error(err.message || t("server.startFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const response = await apiPost("/api/frpc/terminate", { id });
      if (response.ok) {
        toast.success(t("server.stopSuccess"));
        fetchServer(false);
      } else {
        toast.error(t("server.stopFailed"));
      }
    } catch (err: any) {
      toast.error(err.message || t("server.stopFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  // SSE log streaming
  useEffect(() => {
    if (!id) return;

    const token = pb.authStore.token;
    const es = new EventSource(`/api/frpc/logs/stream?id=${id}&token=${token}`);

    es.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data]);
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [id]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "green";
      case "stopped":
        return "red";
      default:
        return "gray";
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ height: "100%" }}>
        <Loading />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex direction="column" justify="center" align="center" style={{ height: "100%" }} gap="4">
        <Icon icon="lucide:alert-circle" width="48" height="48" color="var(--red-9)" />
        <Heading size="4" color="red">
          {t("server.failedToLoad")}
        </Heading>
        <Text color="gray">{error}</Text>
        <Button variant="soft" onClick={() => navigate("/servers")}>
          {t("server.backToServers")}
        </Button>
      </Flex>
    );
  }

  if (!server) return null;

  return (
    <Flex direction="column" gap="5" className="flex-1">
      {/* Header */}
      <PageHeader
        title={server.serverName}
        description={t("server.detailsAndLogs")}
        visible={mounted}
        extra={
          <Flex gap="3" align="center">
            {server.bootStatus === "running" ? (
              <Button size="2" color="red" variant="soft" onClick={handleStop} disabled={actionLoading}>
                {actionLoading ? <Icon icon="lucide:loader-2" className="animate-spin" /> : <Icon icon="lucide:square" width="16" height="16" />}
                {t("server.stop")}
              </Button>
            ) : (
              <Button size="2" color="green" variant="soft" onClick={handleStart} disabled={actionLoading}>
                {actionLoading ? <Icon icon="lucide:loader-2" className="animate-spin" /> : <Icon icon="lucide:play" width="16" height="16" />}
                {t("server.start")}
              </Button>
            )}
          </Flex>
        }
      />
      {/*<motion.div*/}
      {/*  initial={{ opacity: 0, y: -20 }}*/}
      {/*  animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}*/}
      {/*  transition={{ duration: 0.5, ease: "easeOut" }}*/}
      {/*>*/}
      {/*  <Flex justify="end" align="center">*/}
      {/*    <motion.div*/}
      {/*      whileHover={{ scale: 1.05 }}*/}
      {/*      whileTap={{ scale: 0.95 }}*/}
      {/*    >*/}
      {/*      <Button variant="soft" onClick={() => navigate("/servers")}>*/}
      {/*        <Icon icon="lucide:arrow-left" width="16" height="16" />*/}
      {/*        Back to Servers*/}
      {/*      </Button>*/}
      {/*    </motion.div>*/}
      {/*  </Flex>*/}
      {/*</motion.div>*/}

      <Grid columns={{ initial: "1", md: "2" }} gap="4">
        {/* Basic Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          <Card size="3">
            <Flex direction="column" gap="4">
              <Heading size="4">{t("server.basicInformation")}</Heading>

              <Grid columns={{ initial: "1", md: "2" }} gap="4">
                <Box>
                  <Text size="2" color="gray">
                    {t("server.hostAddress")}
                  </Text>
                  <Text as="div" size="3" weight="medium">
                    {server.serverAddr}
                  </Text>
                </Box>
                <Box>
                  <Text size="2" color="gray">
                    {t("server.port")}
                  </Text>
                  <Text as="div" size="3" weight="medium">
                    {server.serverPort}
                  </Text>
                </Box>
                {server.user && (
                  <Box>
                    <Text size="2" color="gray">
                      {t("server.user")}
                    </Text>
                    <Text as="div" size="3" weight="medium">
                      {server.user}
                    </Text>
                  </Box>
                )}
                <Box>
                  <Text size="2" color="gray">
                    {t("server.latency")}
                  </Text>
                  <Box mt="1">
                    <ServerLatency networkStatus={server.networkStatus} size="3" />
                  </Box>
                </Box>
                <Box>
                  <Text size="2" color="gray">
                    {t("server.location")}
                  </Text>
                  <Box mt="1">
                    <ServerLocation geoLocation={server.geoLocation} size="3" />
                  </Box>
                </Box>
                <Box>
                  <Text size="2" color="gray">
                    {t("common.status")}
                  </Text>
                  <Flex align="center" gap="2" mt="1">
                    <Badge
                      radius="full"
                      color={getStatusColor(server.bootStatus)}
                      variant="soft"
                      className={`animate-status-appear ${
                        server.bootStatus === "running"
                          ? "animate-status-pulse"
                          : server.bootStatus === "stopped"
                            ? "animate-status-fade"
                            : ""
                      }`}
                    >
                      <span
                        className={`status-dot ${
                          server.bootStatus === "running"
                            ? "status-dot-green"
                            : server.bootStatus === "stopped"
                              ? "status-dot-red"
                              : "status-dot-gray"
                        }`}
                      />
                      {server.bootStatus === "running"
                        ? t("server.running")
                        : server.bootStatus === "stopped"
                          ? t("server.stopped")
                          : t("common.status")}
                    </Badge>
                  </Flex>
                </Box>
                <Box>
                  <Text size="2" color="gray">
                    {t("server.protocol")}
                  </Text>
                  <Text as="div" size="3" weight="medium" style={{ textTransform: "uppercase" }}>
                    {server.transport?.protocol || "TCP"}
                  </Text>
                </Box>
                <Box>
                  <Text size="2" color="gray">
                    {t("server.createdAt")}
                  </Text>
                  <Text as="div" size="3">
                    {new Date(server.created).toLocaleString()}
                  </Text>
                </Box>
                <Box>
                  <Text size="2" color="gray">
                    {t("server.lastUpdated")}
                  </Text>
                  <Text as="div" size="3">
                    {new Date(server.updated).toLocaleString()}
                  </Text>
                </Box>
              </Grid>
            </Flex>
          </Card>
        </motion.div>

        {/* Configuration Summary or Other Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          <Card size="3" style={{ height: "100%" }}>
            <Flex direction="column" gap="4">
              <Heading size="4">{t("server.configuration")}</Heading>
              <Box>
                <Text size="2" color="gray">
                  {t("common.description")}
                </Text>
                <Text as="div" size="3">
                  {server.description || t("server.noDescription")}
                </Text>
              </Box>

              {server.transport?.tls?.enable && (
                <Flex align="center" gap="2">
                  <Text size="2" color="gray">
                    {t("server.tls")}
                  </Text>
                  <Badge color="blue" variant="soft">
                    {t("server.enabled")}
                  </Badge>
                </Flex>
              )}

              {server.transport?.proxyURL && (
                <Box>
                  <Text size="2" color="gray">
                    {t("server.proxyURL")}
                  </Text>
                  <Text as="div" size="3" style={{ wordBreak: "break-all" }}>
                    {server.transport.proxyURL}
                  </Text>
                </Box>
              )}
            </Flex>
          </Card>
        </motion.div>
      </Grid>

      {/* Proxy List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      >
        <Card size="3">
          <Flex justify="between" align="center" mb="4">
            <Heading size="4">{t("proxy.title")}</Heading>
            <Flex gap="2">
              <Button size="1" variant="soft" onClick={refresh} disabled={refreshing}>
                <Icon
                  icon="lucide:refresh-cw"
                  width="14"
                  height="14"
                  className={refreshing ? "animate-spin" : ""}
                />
                {t("proxy.refresh")}
              </Button>
              <Button size="1" onClick={() => navigate(`/proxies/new?serverId=${id}`)}>
                <Icon icon="lucide:plus" width="14" height="14" />
                {t("proxy.addProxy")}
              </Button>
            </Flex>
          </Flex>

          {proxies.length === 0 ? (
            <Flex direction="column" align="center" gap="2" py="6">
              <Icon icon="lucide:network" width="32" height="32" color="var(--gray-8)" />
              <Text size="2" color="gray">{t("proxy.noProxies")}</Text>
            </Flex>
          ) : (
            <div className="overflow-x-auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>{t("common.name")}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t("common.type")}</Table.ColumnHeaderCell>
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
                        <Text weight="medium">{proxy.name || <Text color="gray">-</Text>}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant="surface">{proxy.proxyType.toUpperCase()}</Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {(() => {
                          const ip = proxy.localIP || "127.0.0.1";
                          const copyKey = `${proxy.id}-localIP`;
                          const isCopied = copiedId === copyKey;
                          return (
                            <Flex align="center" gap="1" style={{ cursor: "pointer" }}
                              onClick={() => handleCopy(ip, copyKey)}
                              title={isCopied ? t("common.copied") : t("common.clickToCopy")}>
                              <Text size="2" color="gray">{ip}</Text>
                              <Icon icon={isCopied ? "lucide:check" : "lucide:copy"} width="12" height="12"
                                color={isCopied ? "var(--green-9)" : "var(--gray-8)"} />
                            </Flex>
                          );
                        })()}
                      </Table.Cell>
                      <Table.Cell>
                        {proxy.localPort ? (() => {
                          const copyKey = `${proxy.id}-localPort`;
                          const isCopied = copiedId === copyKey;
                          return (
                            <Flex align="center" gap="1" style={{ cursor: "pointer" }}
                              onClick={() => handleCopy(String(proxy.localPort), copyKey)}
                              title={isCopied ? t("common.copied") : t("common.clickToCopy")}>
                              <Text size="2">{proxy.localPort}</Text>
                              <Icon icon={isCopied ? "lucide:check" : "lucide:copy"} width="12" height="12"
                                color={isCopied ? "var(--green-9)" : "var(--gray-8)"} />
                            </Flex>
                          );
                        })() : <Text size="2" color="gray">-</Text>}
                      </Table.Cell>
                      <Table.Cell>
                        {(() => {
                          if (proxy.proxyType === "http" || proxy.proxyType === "https") {
                            const items: string[] = [];
                            if (proxy.subdomain && server?.serverAddr) items.push(`${proxy.subdomain}.${server.serverAddr}`);
                            if (proxy.customDomains?.length) items.push(...proxy.customDomains);
                            if (items.length === 0) return <Text size="2" color="gray">-</Text>;
                            return (
                              <Flex direction="column" gap="1">
                                {items.map((domain, i) => {
                                  const copyKey = `${proxy.id}-domain-${i}`;
                                  const isCopied = copiedId === copyKey;
                                  return (
                                    <Flex key={i} align="center" gap="1" style={{ cursor: "pointer" }}
                                      onClick={() => handleCopy(domain, copyKey)}
                                      title={isCopied ? t("common.copied") : t("common.clickToCopy")}>
                                      <Text size="2">{domain}</Text>
                                      <Icon icon={isCopied ? "lucide:check" : "lucide:copy"} width="12" height="12"
                                        color={isCopied ? "var(--green-9)" : "var(--gray-8)"} />
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
                            <Flex align="center" gap="1" style={{ cursor: "pointer" }}
                              onClick={() => handleCopy(displayText, copyKey)}
                              title={isCopied ? t("common.copied") : t("common.clickToCopy")}>
                              <Text size="2">{displayText}</Text>
                              <Icon icon={isCopied ? "lucide:check" : "lucide:copy"} width="12" height="12"
                                color={isCopied ? "var(--green-9)" : "var(--gray-8)"} />
                            </Flex>
                          );
                        })()}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge radius="full" color={proxy.bootStatus === "online" ? "green" : "red"}>
                          <span className={`status-dot ${proxy.bootStatus === "online" ? "status-dot-green" : "status-dot-red"}`} />
                          {proxy.bootStatus === "online" ? t("proxy.online") : t("proxy.offline")}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <button
                          onClick={() => toggleStatus(proxy)}
                          disabled={togglingId === proxy.id}
                          style={{ cursor: togglingId === proxy.id ? "not-allowed" : "pointer", background: "none", border: "none", padding: 0, opacity: togglingId === proxy.id ? 0.6 : 1, transition: "opacity 0.2s" }}
                          title={proxy.status === "enabled" ? t("proxy.clickToDisable") : t("proxy.clickToEnable")}
                        >
                          <Badge color={proxy.status === "enabled" ? "green" : "gray"} style={{ cursor: "inherit" }}>
                            {togglingId === proxy.id
                              ? <Icon icon="lucide:loader-2" width="12" height="12" className="animate-spin" />
                              : <Icon icon={proxy.status === "enabled" ? "lucide:power" : "lucide:power-off"} width="12" height="12" />}
                            {proxy.status === "enabled" ? t("proxy.enabled") : t("proxy.disabled")}
                          </Badge>
                        </button>
                      </Table.Cell>
                      <Table.Cell>
                        <Flex gap="2">
                          <Button size="1" variant="soft" onClick={() => navigate(`/proxies/${proxy.id}/edit`)}>
                            <Icon icon="lucide:pencil" width="14" height="14" />
                            {t("common.edit")}
                          </Button>
                          <Button size="1" variant="soft" color="red" onClick={() => setDeleteProxyId(proxy.id)}>
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

      {/* Logs Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        className="flex flex-1 flex-col" // To make it expand
      >
        <Card size="3" className="flex flex-1 flex-col">
          <Flex justify="between" align="center" mb="4">
            <Heading size="4">{t("server.connectionLogs")}</Heading>
            <Flex gap="2">
              <Button size="1" variant="soft" onClick={() => setLogs([])}>
                <Icon icon="lucide:trash-2" /> {t("server.clear")}
              </Button>
            </Flex>
          </Flex>

          <Box
            ref={logContainerRef}
            style={{
              backgroundColor: "var(--gray-2)",
              borderRadius: "var(--radius-3)",
              padding: "1rem",
              fontFamily: "monospace",
              fontSize: "0.9rem",
              height: "300px",
              overflowY: "auto",
            }}
          >
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} style={{ marginBottom: "4px" }}>
                  <Text color="gray">{log}</Text>
                </div>
              ))
            ) : (
              <Text color="gray" style={{ fontStyle: "italic" }}>
                {t("server.noLogsAvailable")}
              </Text>
            )}
          </Box>
        </Card>
      </motion.div>

      {/* Proxy Delete Confirmation */}
      <AlertDialog.Root open={!!deleteProxyId} onOpenChange={() => setDeleteProxyId(null)}>
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
                  if (deleteProxyId) {
                    deleteProxy(deleteProxyId);
                    setDeleteProxyId(null);
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
    </Flex>
  );
}
