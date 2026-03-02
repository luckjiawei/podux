import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Flex, Text, useThemeContext } from "@radix-ui/themes";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import type { TopologyData } from "./useDashboard";

// ── Layout ────────────────────────────────────────────────────────────────────
const VISITOR_W = 112;
const VISITOR_H = 90;
const SERVER_W = 158;
const SERVER_H = 92;
const PROXY_W = 150;
const PROXY_H = 92;
const LOCAL_W = 140;
const LOCAL_H = 68;
const ROW_H = 112; // row height (node height + gap)

// Column left-edge X positions
const COL = {
  visitor: 0,
  server: 160, // VISITOR_W + 48
  proxy: 400, // server + SERVER_W + 82
  local: 638, // proxy  + PROXY_W  + 88
};

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  // edge colours
  eVisitor: "#6366f1", // visitor → server : indigo (decorative)
  eOn: "#22c55e", // any active edge  : green
  eOff: "#71717a", // any inactive edge: gray

  // status
  online: "#22c55e",
  offline: "#ef4444",

  // proxy type
  tcp: "#3b82f6",
  udp: "#22c55e",
  http: "#f97316",
  https: "#a855f7",
} as const;

function typeColor(t: string): string {
  return (C as Record<string, string>)[t.toLowerCase()] ?? "#6b7280";
}

// Theme
const LIGHT = {
  bg: "#ffffff",
  text: "#111827",
  sub: "#6b7280",
  border: "#e5e7eb",
  pageBg: "#f3f4f6",
  dot: "#d1d5db",
};
const DARK = {
  bg: "#1c1c2e",
  text: "#f0f0f0",
  sub: "#9ca3af",
  border: "#2d2d44",
  pageBg: "#13131f",
  dot: "#3d3d55",
};
type Palette = typeof LIGHT;

// Shared
function StatusPill({
  online,
  labels = ["Online", "Offline"],
}: {
  online: boolean;
  labels?: [string, string];
}) {
  const color = online ? C.online : C.offline;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 7px",
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 700,
        background: color + "20",
        color,
        border: `1px solid ${color + "60"}`,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      {online ? labels[0] : labels[1]}
    </span>
  );
}

function NodeCard({
  w,
  h,
  accentColor,
  children,
  targetPos,
  targetColor,
  sourcePos,
  sourceColor,
  p: palette,
}: {
  w: number;
  h: number;
  accentColor: string;
  children: React.ReactNode;
  targetPos?: Position;
  targetColor?: string;
  sourcePos?: Position;
  sourceColor?: string;
  p: Palette;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 10,
        boxSizing: "border-box",
        border: `1.5px solid ${palette.border}`,
        borderLeft: `3px solid ${accentColor}`,
        background: palette.bg,
        display: "flex",
        flexDirection: "column",
        padding: "8px 10px",
        gap: 4,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      {targetPos !== undefined && (
        <Handle
          type="target"
          position={targetPos}
          style={{ background: targetColor, border: "none", width: 8, height: 8 }}
        />
      )}
      {sourcePos !== undefined && (
        <Handle
          type="source"
          position={sourcePos}
          style={{ background: sourceColor, border: "none", width: 8, height: 8 }}
        />
      )}
      {children}
    </div>
  );
}

// Visitor Node
function VisitorNode({ data }: { data: Record<string, string> }) {
  const { t } = useTranslation();
  const p = data.isDark === "1" ? DARK : LIGHT;
  return (
    <div
      style={{
        width: VISITOR_W,
        height: VISITOR_H,
        borderRadius: 12,
        boxSizing: "border-box",
        border: `2px solid ${C.eVisitor}40`,
        background: C.eVisitor + "12",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
      }}
    >
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: C.eOn, border: "none", width: 8, height: 8 }}
      />
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: C.eVisitor + "20",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon icon="lucide:users" width={18} height={18} color={C.eVisitor} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: p.text }}>
          {t("dashboard.topologyVisitors")}
        </div>
        <div style={{ fontSize: 9, color: p.sub }}>{t("dashboard.topologyInternet")}</div>
      </div>
    </div>
  );
}

// Server Node
function ServerNode({ data }: { data: Record<string, string> }) {
  const p = data.isDark === "1" ? DARK : LIGHT;
  const online = data.bootStatus === "running";
  const accent = online ? C.online : C.eOff;
  const handleColor = online ? C.eOn : C.eOff;
  return (
    <NodeCard
      w={SERVER_W}
      h={SERVER_H}
      accentColor={accent}
      p={p}
      targetPos={Position.Left}
      targetColor={handleColor}
      sourcePos={Position.Right}
      sourceColor={handleColor}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon icon="lucide:server" width={13} height={13} color={p.sub} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: p.text,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.serverName}
        </span>
      </div>
      <span
        style={{
          fontSize: 10,
          color: p.sub,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {data.serverAddr}
      </span>
      <StatusPill online={online} labels={["Running", "Stopped"]} />
    </NodeCard>
  );
}

// Proxy Node
function ProxyNode({ data }: { data: Record<string, string> }) {
  const p = data.isDark === "1" ? DARK : LIGHT;
  const online = data.bootStatus === "online";
  const tc = typeColor(data.proxyType);
  const handleColor = online ? C.eOn : C.eOff;
  return (
    <NodeCard
      w={PROXY_W}
      h={PROXY_H}
      accentColor={online ? C.online : C.eOff}
      p={p}
      targetPos={Position.Left}
      targetColor={handleColor}
      sourcePos={Position.Right}
      sourceColor={handleColor}
    >
      {/* icon + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon icon="lucide:network" width={13} height={13} color={p.sub} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: p.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.name}
        </span>
      </div>
      {/* protocol + port */}
      <span style={{ fontSize: 10, color: p.sub }}>
        <span style={{ color: tc, fontWeight: 700 }}>{data.proxyType.toUpperCase()}</span>
        {data.remotePort && <span style={{ fontFamily: "monospace" }}> :{data.remotePort}</span>}
      </span>
      {/* status */}
      <StatusPill online={online} />
    </NodeCard>
  );
}

// ── Local Service Node ────────────────────────────────────────────────────────
function LocalServiceNode({ data }: { data: Record<string, string> }) {
  const { t } = useTranslation();
  const p = data.isDark === "1" ? DARK : LIGHT;
  return (
    <NodeCard
      w={LOCAL_W}
      h={LOCAL_H}
      accentColor={C.eOn}
      p={p}
      targetPos={Position.Left}
      targetColor={C.eOn}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon icon="lucide:hard-drive" width={13} height={13} color={p.sub} />
        <span style={{ fontSize: 10, fontWeight: 700, color: p.text }}>
          {t("dashboard.topologyLocalService")}
        </span>
      </div>
      <span style={{ fontSize: 11, color: p.sub, fontFamily: "monospace" }}>
        {data.localIP}:{data.localPort}
      </span>
    </NodeCard>
  );
}

const nodeTypes = {
  visitor: VisitorNode,
  server: ServerNode,
  proxy: ProxyNode,
  localService: LocalServiceNode,
};

// Edge
function mkEdge(id: string, source: string, target: string, color: string, active: boolean): Edge {
  return {
    id,
    source,
    target,
    type: "smoothstep",
    animated: active,
    style: {
      stroke: active ? color : C.eOff,
      strokeWidth: active ? 2 : 1.5,
      strokeDasharray: active ? undefined : "5 4",
    },
  };
}

// Main
interface TopologyChartProps {
  topology: TopologyData;
}

export function TopologyChart({ topology }: TopologyChartProps) {
  const { t } = useTranslation();
  const themeCtx = useThemeContext();
  const isDark = themeCtx.appearance === "dark";
  const p = isDark ? DARK : LIGHT;
  const { servers, proxies } = topology;

  const { nodes, edges, totalRows } = useMemo(() => {
    if (servers.length === 0) return { nodes: [], edges: [], totalRows: 0 };

    // group proxies by server
    const groups = new Map<string, typeof proxies>();
    for (const px of proxies) {
      if (!groups.has(px.serverId)) groups.set(px.serverId, []);
      groups.get(px.serverId)!.push(px);
    }

    // build row assignments
    const serverRows: Array<{
      server: (typeof servers)[0];
      sProxies: typeof proxies;
      startRow: number;
      rowCount: number;
    }> = [];
    let row = 0;
    for (const server of servers) {
      const sProxies = groups.get(server.id) ?? [];
      const rowCount = Math.max(sProxies.length, 1);
      serverRows.push({ server, sProxies, startRow: row, rowCount });
      row += rowCount;
    }
    const totalRows = row;

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const dk = isDark ? "1" : "0";

    // Visitor node — vertically centred over all content
    const visitorY = (totalRows * ROW_H) / 2 - VISITOR_H / 2;
    nodes.push({
      id: "visitor",
      type: "visitor",
      position: { x: COL.visitor, y: visitorY },
      data: { isDark: dk },
      draggable: false,
    });

    for (const { server, sProxies, startRow, rowCount } of serverRows) {
      const serverOnline = server.bootStatus === "running";
      const serverCY = (startRow + rowCount / 2) * ROW_H;
      const serverY = serverCY - SERVER_H / 2;

      // Server node
      nodes.push({
        id: server.id,
        type: "server",
        position: { x: COL.server, y: serverY },
        data: {
          serverName: server.serverName,
          serverAddr: server.serverAddr,
          bootStatus: server.bootStatus,
          isDark: dk,
        },
        draggable: false,
      });

      // Visitor → Server
      edges.push(mkEdge(`e-vis-${server.id}`, "visitor", server.id, C.eOn, serverOnline));

      if (sProxies.length === 0) continue;

      sProxies.forEach((px, pi) => {
        const proxyOnline = px.bootStatus === "online";
        const rowCY = (startRow + pi) * ROW_H + ROW_H / 2;
        const proxyY = rowCY - PROXY_H / 2;
        const localY = rowCY - LOCAL_H / 2;
        const localId = `local-${px.id}`;

        // Proxy node
        nodes.push({
          id: px.id,
          type: "proxy",
          position: { x: COL.proxy, y: proxyY },
          data: {
            name: px.name,
            proxyType: px.proxyType,
            remotePort: px.remotePort,
            status: px.status,
            bootStatus: px.bootStatus,
            isDark: dk,
          },
          draggable: false,
        });

        // Local service node
        nodes.push({
          id: localId,
          type: "localService",
          position: { x: COL.local, y: localY },
          data: {
            localIP: px.localIP,
            localPort: px.localPort,
            bootStatus: px.bootStatus,
            isDark: dk,
          },
          draggable: false,
        });

        // Server → Proxy (tunnel)
        edges.push(
          mkEdge(`e-${server.id}-${px.id}`, server.id, px.id, C.eOn, serverOnline && proxyOnline)
        );
        // Proxy → Local Service
        edges.push(mkEdge(`e-${px.id}-${localId}`, px.id, localId, C.eOn, proxyOnline));
      });
    }

    return { nodes, edges, totalRows };
  }, [servers, proxies, isDark]);

  if (servers.length === 0) {
    return (
      <Flex direction="column" align="center" justify="center" gap="3" style={{ height: 240 }}>
        <Icon icon="lucide:network" color="var(--gray-7)" width="56" height="56" />
        <Flex direction="column" align="center" gap="1">
          <Text size="3" weight="medium" color="gray">
            {t("dashboard.topologyEmpty")}
          </Text>
          <Text size="2" color="gray">
            {t("dashboard.topologyEmptyDesc")}
          </Text>
        </Flex>
      </Flex>
    );
  }

  const containerH = Math.max(480, Math.min(900, totalRows * ROW_H + 80));

  return (
    <div style={{ height: containerH, borderRadius: 8, overflow: "hidden" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={isDark ? "dark" : "light"}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.25}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: p.pageBg }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={p.dot} />
      </ReactFlow>
    </div>
  );
}
