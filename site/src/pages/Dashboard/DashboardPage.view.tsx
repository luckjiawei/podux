import { Box, Card, Flex, Text } from "@radix-ui/themes";
import type {
  DashboardStats,
  RecentActivity,
  TopologyData,
  TrafficHistoryPoint,
} from "./useDashboard";
import { TopologyChart } from "./TopologyChart";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Icon } from "@iconify/react";
import { PageHeader } from "../../components/PageHeader";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AnimateNumber } from "../../components/AnimateNumber";
import { useTranslation } from "react-i18next";
import "./DashboardPage.css";

interface DashboardViewProps {
  stats: DashboardStats;
  activities: RecentActivity[];
  trafficHistory: TrafficHistoryPoint[];
  topology: TopologyData;
  loading: boolean;
}

import { StatCard } from "../../components/StatCard";

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export function DashboardView({ stats, topology }: DashboardViewProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Flex direction="column" gap="6">
      {/* Header */}
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.overview")}
        visible={mounted}
      />

      {/* Stats Cards Row 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          <StatCard
            title={t("dashboard.runningProxies")}
            value={
              <>
                <AnimateNumber value={stats.runningProxies} decimalPlaces={0} />
                <Text size="2" color="gray" weight="regular" ml="2">
                  / {stats.totalProxies}
                </Text>
              </>
            }
            color="green"
            icon={<Icon icon="lucide:network" color="var(--green-11)" width="32" height="32" />}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          <StatCard
            title={t("dashboard.onlineServers")}
            value={
              <>
                <AnimateNumber value={stats.onlineServers} decimalPlaces={0} />
                <Text size="2" color="gray" weight="regular" ml="2">
                  / {stats.totalServers}
                </Text>
              </>
            }
            color="blue"
            icon={<Icon icon="lucide:server" color="var(--blue-11)" width="32" height="32" />}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        >
          <StatCard
            title={t("dashboard.maxLatency")}
            value={
              <>
                <AnimateNumber value={stats.maxLatency} decimalPlaces={0} />
                <Text size="2" color="gray" weight="regular" ml="2">
                  ms
                </Text>
              </>
            }
            color="orange"
            icon={<Icon icon="lucide:activity" color="var(--orange-11)" width="32" height="32" />}
          />
        </motion.div>
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
        >
          <StatCard
            title="Traffic Out"
            value={
              <AnimateNumber
                value={stats.totalTrafficOut}
                unit={stats.totalTrafficOutUnit}
              />
            }
            color="orange"
            icon={
              <Icon
                icon="lucide:upload"
                color="var(--orange-11)"
                width="32"
                height="32"
              />
            }
          />
        </motion.div> */}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
      >
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold" color="gray">
            {t("dashboard.quickActions")}
          </Text>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                { to: "/servers", icon: "lucide:server", color: "var(--blue-9)", bg: "var(--blue-3)", titleKey: "nav.servers", descKey: "dashboard.qaServersDesc" },
                { to: "/proxies", icon: "lucide:network", color: "var(--green-9)", bg: "var(--green-3)", titleKey: "nav.proxies", descKey: "dashboard.qaProxiesDesc" },
                { to: "/import", icon: "lucide:file-input", color: "var(--orange-9)", bg: "var(--orange-3)", titleKey: "nav.import", descKey: "dashboard.qaImportDesc" },
                { to: "/settings", icon: "lucide:settings-2", color: "var(--purple-9)", bg: "var(--purple-3)", titleKey: "nav.settings", descKey: "dashboard.qaSettingsDesc" },
              ] as const
            ).map(({ to, icon, color, bg, titleKey, descKey }) => (
              <Link key={to} to={to} style={{ textDecoration: "none" }}>
                <Card size="2" style={{ cursor: "pointer", height: "100%" }}>
                  <Flex direction="column" gap="2">
                    <Box
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "var(--radius-3)",
                        background: bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon icon={icon} color={color} width="18" height="18" />
                    </Box>
                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                      <Text size="2" weight="bold">
                        {t(titleKey)}
                      </Text>
                      <Text size="1" color="gray">
                        {t(descKey)}
                      </Text>
                    </Flex>
                    <Flex justify="end">
                      <Icon icon="lucide:arrow-right" color="var(--gray-8)" width="14" height="14" />
                    </Flex>
                  </Flex>
                </Card>
              </Link>
            ))}
          </div>
        </Flex>
      </motion.div>

      {/* Proxy Type Distribution & System Uptime */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Proxy Type Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
        >
          <Card size="3" style={{ outline: "none" }}>
            <Flex direction="column" gap="4" style={{ outline: "none" }}>
              {/* <Text size="3" weight="bold">
                Proxy Type Distribution
              </Text> */}

              <Box className="h-[350px] w-full" style={{ outline: "none" }}>
                {Object.keys(stats.proxyTypeCounts).length === 0 ? (
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    gap="3"
                    style={{ height: "100%" }}
                  >
                    <Icon icon="lucide:pie-chart" color="var(--gray-7)" width="56" height="56" />
                    <Flex direction="column" align="center" gap="1">
                      <Text size="3" weight="medium" color="gray">
                        {t("dashboard.noProxies")}
                      </Text>
                      <Text size="2" color="gray">
                        {t("dashboard.noProxiesDesc")}
                      </Text>
                    </Flex>
                  </Flex>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart style={{ outline: "none" }}>
                      <Pie
                        style={{ outline: "none" }}
                        data={Object.entries(stats.proxyTypeCounts).map(([type, count]) => ({
                          name: type.toUpperCase(),
                          value: count,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.keys(stats.proxyTypeCounts).map((type, index) => {
                          const colors = {
                            tcp: "var(--blue-9)",
                            udp: "var(--green-9)",
                            http: "var(--orange-9)",
                            https: "var(--purple-9)",
                          };
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={colors[type as keyof typeof colors] || "var(--gray-9)"}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-panel-solid)",
                          borderColor: "var(--gray-5)",
                          borderRadius: "var(--radius-3)",
                          fontSize: "12px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </Flex>
          </Card>
        </motion.div>

        {/* System Uptime */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
        >
          <Card size="3">
            <Flex
              direction="column"
              gap="3"
              align="center"
              justify="center"
              className="h-full min-h-[350px]"
            >
              <Icon icon="lucide:clock" color="var(--indigo-9)" width="56" height="56" />
              <Flex direction="column" gap="1" align="center">
                <Text size="3" weight="medium" color="gray">
                  {t("dashboard.systemUptime")}
                </Text>
                <Text size="6" weight="bold" style={{ color: "var(--indigo-11)" }}>
                  {formatUptime(stats.uptimeSeconds)}
                </Text>
                <Text size="2" color="gray">
                  {t("dashboard.runningSinceStartup")}
                </Text>
              </Flex>
            </Flex>
          </Card>
        </motion.div>
      </div>

      {/* Network Topology */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
      >
        <Card size="3">
          <Flex direction="column" gap="3">
            <Flex direction="column" gap="1">
              <Text size="3" weight="bold">
                {t("dashboard.topology")}
              </Text>
              <Text size="2" color="gray">
                {t("dashboard.topologyDesc")}
              </Text>
            </Flex>
            <Box>
              <TopologyChart topology={topology} />
            </Box>
          </Flex>
        </Card>
      </motion.div>
    </Flex>
  );
}
