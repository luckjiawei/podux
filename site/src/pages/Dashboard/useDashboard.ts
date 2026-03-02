import { useState, useEffect } from "react";

export interface DashboardStats {
  totalProxies: number;
  runningProxies: number;
  stoppedProxies: number;
  totalServers: number;
  onlineServers: number;
  offlineServers: number;
  maxLatency: number;
  uptime: string;
  proxyTypeCounts: Record<string, number>;
  uptimeSeconds: number;
}

export interface TopologyServer {
  id: string;
  serverName: string;
  serverAddr: string;
  bootStatus: string;
}

export interface TopologyProxy {
  id: string;
  name: string;
  proxyType: string;
  localIP: string;
  localPort: string;
  remotePort: string;
  status: string;
  bootStatus: string;
  serverId: string;
}

export interface TopologyData {
  servers: TopologyServer[];
  proxies: TopologyProxy[];
}

export interface RecentActivity {
  id: string;
  type:
    | "proxy_started"
    | "proxy_stopped"
    | "server_connected"
    | "server_disconnected"
    | "config_updated";
  message: string;
  timestamp: Date;
}

export interface TrafficHistoryPoint {
  time: string;
  trafficIn: number;
  trafficOut: number;
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProxies: 0,
    runningProxies: 0,
    stoppedProxies: 0,
    totalServers: 0,
    onlineServers: 0,
    offlineServers: 0,
    maxLatency: 0,
    uptime: "0h 0m",
    proxyTypeCounts: {},
    uptimeSeconds: 0,
  });
  const [activities] = useState<RecentActivity[]>([]);
  const [trafficHistory, setTrafficHistory] = useState<TrafficHistoryPoint[]>([]);
  const [topology, setTopology] = useState<TopologyData>({ servers: [], proxies: [] });

  useEffect(() => {
    // Format traffic data

    const loadDashboard = async () => {
      try {
        // Fetch dashboard stats from API
        const response = await fetch(`/api/dashboard/stats`, {});

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }

        const data = await response.json();

        setStats({
          totalProxies: data.proxiesEnabledCount + data.proxiesDisabledCount,
          runningProxies: data.proxiesOnlineCount ?? 0,
          stoppedProxies: data.proxiesDisabledCount,
          totalServers: data.runningCount + data.stoppedCount,
          onlineServers: data.runningCount,
          offlineServers: data.stoppedCount,
          maxLatency: data.maxLatency || 0,
          // totalTrafficOut: formatBytes(data.totalSent).value,
          // totalTrafficOutUnit: formatBytes(data.totalSent).unit,
          uptime: "N/A",
          proxyTypeCounts: data.proxyTypeCounts || {},
          uptimeSeconds: data.uptimeSeconds || 0,
        });

        // Fetch topology from API
        try {
          const topoResponse = await fetch(`/api/dashboard/topology`);
          if (topoResponse.ok) {
            const topoData = await topoResponse.json();
            setTopology(topoData);
          }
        } catch (topoErr) {
          console.error("Failed to load topology:", topoErr);
        }

        // Fetch traffic history from API
        try {
          const historyResponse = await fetch(`/api/dashboard/traffic-history?hours=24`);
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            setTrafficHistory(historyData);
          } else {
            // If API fails, set empty array
            setTrafficHistory([]);
          }
        } catch (historyErr) {
          console.error("Failed to load traffic history:", historyErr);
          // Set empty array on error
          setTrafficHistory([]);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
    };

    loadDashboard();

    // Poll for updates every 30 seconds
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  return { stats, activities, trafficHistory, topology };
}
