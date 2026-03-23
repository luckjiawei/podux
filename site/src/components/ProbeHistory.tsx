import { useEffect, useState } from "react";
import { Flex, Text, Tooltip, Badge } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { apiGet } from "../lib/api";

interface ProbePoint {
  t: string;
  val: number;
}

interface Bucket {
  start: number;
  end: number;
  avg: number | null; // null = no data, -1 = unreachable
}

const BUCKETS = 30;
const WINDOW_MS = 30 * 60 * 1000;

function buildBuckets(points: ProbePoint[]): Bucket[] {
  const now = Date.now();
  const slotMs = WINDOW_MS / BUCKETS;

  const buckets: Bucket[] = Array.from({ length: BUCKETS }, (_, i) => ({
    start: now - WINDOW_MS + i * slotMs,
    end: now - WINDOW_MS + (i + 1) * slotMs,
    avg: null,
  }));

  for (const p of points) {
    const ts = new Date(p.t.replace(" ", "T").replace(/Z$/, "+00:00")).getTime();
    const idx = Math.floor((ts - (now - WINDOW_MS)) / slotMs);
    if (idx < 0 || idx >= BUCKETS) continue;
    const b = buckets[idx];
    if (p.val < 0) {
      b.avg = -1;
    } else if (b.avg === null) {
      b.avg = p.val;
    } else if (b.avg >= 0) {
      b.avg = (b.avg + p.val) / 2;
    }
  }

  return buckets;
}

function bucketGradient(avg: number | null): string {
  if (avg === null) return "linear-gradient(to top, var(--gray-4), var(--gray-5))";
  if (avg < 0) return "linear-gradient(to top, var(--red-6), var(--red-8))";
  if (avg < 50) return "linear-gradient(to top, var(--green-7), var(--green-9))";
  if (avg < 150) return "linear-gradient(to top, var(--amber-7), var(--amber-9))";
  return "linear-gradient(to top, var(--red-7), var(--red-9))";
}

function bucketGlow(avg: number | null): string {
  if (avg === null || avg < 0) return "none";
  if (avg < 50) return "0 2px 8px var(--green-a6)";
  if (avg < 150) return "0 2px 8px var(--amber-a6)";
  return "0 2px 8px var(--red-a6)";
}

function bucketLabel(b: Bucket, noData: string, unreachable: string): string {
  const fmt = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const range = `${fmt(b.start)} – ${fmt(b.end)}`;
  if (b.avg === null) return `${range}\n${noData}`;
  if (b.avg < 0) return `${range}\n${unreachable}`;
  return `${range}\n${Math.round(b.avg)}ms`;
}

interface ProbeHistoryProps {
  serverId: string;
}

export function ProbeHistory({ serverId }: ProbeHistoryProps) {
  const { t } = useTranslation();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
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
        setBuckets(buildBuckets(points));
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

  // Stats
  const valid = buckets.filter((b) => b.avg !== null);
  const reachable = valid.filter((b) => b.avg! >= 0);
  const uptime = valid.length > 0 ? (reachable.length / valid.length) * 100 : null;
  const avgLatency =
    reachable.length > 0
      ? Math.round(reachable.reduce((s, b) => s + b.avg!, 0) / reachable.length)
      : null;
  const maxLatency =
    reachable.length > 0 ? Math.round(Math.max(...reachable.map((b) => b.avg!))) : null;

  const lastActiveIdx = buckets.reduce((last, b, i) => (b.avg !== null ? i : last), -1);

  const uptimeColor =
    uptime === null ? "gray" : uptime === 100 ? "green" : uptime >= 80 ? "amber" : "red";

  return (
    <Flex direction="column" gap="4">
      {/* Stats row */}
      <Flex gap="5" align="center" wrap="wrap">
        {/* Overall status */}
        <Flex align="center" gap="2">
          {uptime === null || loading ? (
            <Badge color="gray" variant="soft">
              <Icon icon="lucide:loader-2" width="10" height="10" className="animate-spin" />
              {t("server.probeChecking")}
            </Badge>
          ) : uptime === 100 ? (
            <Badge color="green" variant="soft">
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                style={{ display: "flex", alignItems: "center" }}
              >
                <Icon icon="lucide:circle" width="8" height="8" />
              </motion.span>
              {t("server.probeNormal")}
            </Badge>
          ) : uptime >= 80 ? (
            <Badge color="amber" variant="soft">
              <Icon icon="lucide:alert-circle" width="10" height="10" />
              {t("server.probePartial")}
            </Badge>
          ) : (
            <Badge color="red" variant="soft">
              <Icon icon="lucide:x-circle" width="10" height="10" />
              {t("server.probeOutage")}
            </Badge>
          )}
        </Flex>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: "var(--gray-5)" }} />

        {/* Uptime */}
        {uptime !== null && (
          <Flex direction="column" gap="0">
            <Text size="1" color="gray">{t("server.probeUptime")}</Text>
            <Text size="2" weight="bold" color={uptimeColor}>
              {uptime.toFixed(1)}%
            </Text>
          </Flex>
        )}

        {/* Avg latency */}
        {avgLatency !== null && (
          <Flex direction="column" gap="0">
            <Text size="1" color="gray">{t("server.probeAvgLatency")}</Text>
            <Text size="2" weight="bold">{avgLatency}ms</Text>
          </Flex>
        )}

        {/* Peak latency */}
        {maxLatency !== null && (
          <Flex direction="column" gap="0">
            <Text size="1" color="gray">{t("server.probePeakLatency")}</Text>
            <Text size="2" weight="bold" color={maxLatency > 150 ? "red" : maxLatency > 50 ? "amber" : undefined}>
              {maxLatency}ms
            </Text>
          </Flex>
        )}
      </Flex>

      {/* Bar grid */}
      <Flex
        gap="1"
        align="end"
        style={{ height: 44, position: "relative" }}
      >
        {loading
          ? Array.from({ length: BUCKETS }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  delay: i * 0.04,
                  ease: "easeInOut",
                }}
                style={{
                  flex: 1,
                  height: 28 + Math.sin(i * 0.5) * 8,
                  borderRadius: 4,
                  background: "var(--gray-4)",
                }}
              />
            ))
          : buckets.map((b, i) => {
              const isLast = i === lastActiveIdx;
              return (
                <Tooltip key={`${animKey}-${i}`} content={bucketLabel(b, t("server.probeNoData"), t("server.probeUnreachable"))}>
                  <motion.div
                    key={animKey}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: b.avg === null ? 0.35 : 1 }}
                    transition={{
                      delay: i * 0.018,
                      duration: 0.35,
                      ease: [0.34, 1.56, 0.64, 1], // spring-like
                    }}
                    whileHover={{
                      scaleY: 1.18,
                      filter: "brightness(1.25)",
                      transition: { duration: 0.12 },
                    }}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 4,
                      background: bucketGradient(b.avg),
                      boxShadow: isLast ? bucketGlow(b.avg) : "none",
                      transformOrigin: "bottom",
                      cursor: "default",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Shine overlay */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, transparent 60%)",
                        borderRadius: 4,
                        pointerEvents: "none",
                      }}
                    />
                    {/* Pulse on latest active bar */}
                    {isLast && b.avg !== null && (
                      <motion.div
                        animate={{ opacity: [0, 0.4, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 2,
                          ease: "easeInOut",
                        }}
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(255,255,255,0.5)",
                          borderRadius: 4,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </motion.div>
                </Tooltip>
              );
            })}
      </Flex>

      {/* Time labels */}
      <Flex justify="between" align="center">
        <Text size="1" color="gray">{t("server.probe30mAgo")}</Text>
        <Flex align="center" gap="2">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green-9)" }}
          />
          <Text size="1" color="gray">{t("server.probeNow")}</Text>
        </Flex>
      </Flex>
    </Flex>
  );
}
