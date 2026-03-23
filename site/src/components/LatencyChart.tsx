import { useEffect, useState } from "react";
import { Flex, Text } from "@radix-ui/themes";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiGet } from "../lib/api";

interface ProbePoint {
  t: string;
  val: number;
}

interface ChartPoint {
  time: string;
  ms: number;
}

function toChartPoints(points: ProbePoint[]): ChartPoint[] {
  return points
    .filter((p) => p.val >= 0)
    .map((p) => ({
      time: new Date(p.t.replace(" ", "T").replace(/Z$/, "+00:00")).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      ms: Math.round(p.val),
    }));
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{
        background: "var(--color-panel-solid)",
        border: "1px solid var(--gray-5)",
        borderRadius: 10,
        padding: "8px 12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
      }}
    >
      <Text size="1" color="gray">{label}</Text>
      <Flex align="center" gap="2" mt="1">
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green-9)" }}
        />
        <Text size="2" weight="bold">{payload[0].value}ms</Text>
      </Flex>
    </motion.div>
  );
}

// ── Pulsing dot on the last data point ───────────────────────────────────────

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  dataLength: number;
}

function PulsingDot({ cx = 0, cy = 0, index = 0, dataLength }: DotProps) {
  if (index !== dataLength - 1) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="var(--green-9)" />
      <circle cx={cx} cy={cy} r={4} fill="var(--green-9)" opacity={0.5}>
        <animate attributeName="r" from="4" to="14" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.5" to="0" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function ChartSkeleton() {
  // Fake wave path to mimic a latency curve
  const path = "M0,60 C20,55 40,70 60,50 C80,30 100,65 120,45 C140,25 160,55 180,40 C200,25 220,50 240,35 C260,20 280,45 300,30 C320,15 340,40 360,25";
  return (
    <svg width="100%" height={180} style={{ overflow: "hidden" }}>
      <defs>
        <linearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--gray-3)" />
          <stop offset="40%" stopColor="var(--gray-5)" />
          <stop offset="100%" stopColor="var(--gray-3)" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from="-1 0"
            to="2 0"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </linearGradient>
        <clipPath id="skeletonClip">
          <rect x="0" y="0" width="100%" height="100%" />
        </clipPath>
      </defs>
      {/* Fake grid lines */}
      {[40, 80, 120, 160].map((y) => (
        <line key={y} x1="52" y1={y} x2="100%" y2={y} stroke="var(--gray-3)" strokeDasharray="4 4" />
      ))}
      {/* Fake Y-axis labels */}
      {[40, 80, 120].map((y, i) => (
        <rect key={i} x="0" y={y - 6} width="36" height="10" rx="4" fill="url(#shimmer)" />
      ))}
      {/* Fake curve area */}
      <path
        d={`${path} L360,180 L0,180 Z`}
        fill="url(#shimmer)"
        opacity={0.5}
        clipPath="url(#skeletonClip)"
      />
      {/* Fake curve line */}
      <path d={path} fill="none" stroke="url(#shimmer)" strokeWidth="2" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface LatencyChartProps {
  serverId: string;
}

export function LatencyChart({ serverId }: LatencyChartProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiGet(`/api/servers/probe-history?serverId=${serverId}`);
        if (!res.ok || cancelled) return;
        const points: ProbePoint[] = await res.json();
        if (cancelled) return;
        setData(toChartPoints(points));
        setAnimKey((k) => k + 1);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [serverId]);

  const isEmpty = !loading && data.length === 0;

  return (
    <div style={{ position: "relative", height: 180 }}>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <ChartSkeleton />
          </motion.div>
        ) : isEmpty ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Text size="2" color="gray">{t("server.probeNoData")}</Text>
          </motion.div>
        ) : (
          <motion.div
            key={`chart-${animKey}`}
            initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ position: "absolute", inset: 0 }}
          >
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--green-9)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--green-9)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-4)" vertical={false} />

                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: "var(--gray-9)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />

                <YAxis
                  tick={{ fontSize: 11, fill: "var(--gray-9)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}ms`}
                  width={52}
                />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "var(--green-7)", strokeWidth: 1, strokeDasharray: "4 4" }}
                />

                <Area
                  type="monotone"
                  dataKey="ms"
                  stroke="var(--green-9)"
                  strokeWidth={2}
                  fill="url(#latencyGrad)"
                  dot={(props: any) => (
                    <PulsingDot key={props.index} {...props} dataLength={data.length} />
                  )}
                  activeDot={{
                    r: 5,
                    fill: "var(--green-9)",
                    stroke: "var(--color-panel-solid)",
                    strokeWidth: 2,
                  }}
                  isAnimationActive={true}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
