import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Flex, Text, Badge, Grid, Button, Heading, Box } from "@radix-ui/themes";
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

  useEffect(() => {
    // Wait for PageTransition to complete before triggering animations
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchServer = async () => {
      try {
        setLoading(true);
        const record = await pb.collection("fh_servers").getOne<Server>(id);
        setServer(record);
      } catch (err: any) {
        if (err.isAbort) return;
        console.error("Failed to load server details:", err);
        setError(err.message || t("server.failedToLoad"));
        toast.error(t("server.failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    fetchServer();
  }, [id, navigate]);

  // SSE log streaming
  useEffect(() => {
    if (!id) return;

    const es = new EventSource(`/api/frpc/logs/stream?id=${id}`);

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
    </Flex>
  );
}
