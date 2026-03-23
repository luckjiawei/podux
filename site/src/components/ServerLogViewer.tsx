import { useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Heading, Text } from "@radix-ui/themes";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import pb from "../lib/pocketbase";

interface ServerLogViewerProps {
  serverId: string;
  /** Height of the scrollable log area. Defaults to 300px. */
  height?: number | string;
  /** Whether to show the card heading. Defaults to true. */
  showHeading?: boolean;
}

export function ServerLogViewer({ serverId, height = 300, showHeading = true }: ServerLogViewerProps) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // SSE log streaming
  useEffect(() => {
    const token = pb.authStore.token;
    const es = new EventSource(`/api/frpc/logs/stream?id=${serverId}&token=${token}`);

    const MAX_LOGS = 500;
    es.onmessage = (event) => {
      setLogs((prev) => {
        const next = [...prev, event.data];
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
      });
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [serverId]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Flex direction="column" gap="3">
      {showHeading && (
        <Flex justify="between" align="center">
          <Heading size="4">{t("server.connectionLogs")}</Heading>
          <Button size="1" variant="soft" onClick={() => setLogs([])}>
            <Icon icon="lucide:trash-2" width="14" height="14" />
            {t("server.clear")}
          </Button>
        </Flex>
      )}

      {!showHeading && (
        <Flex justify="end">
          <Button size="1" variant="soft" onClick={() => setLogs([])}>
            <Icon icon="lucide:trash-2" width="14" height="14" />
            {t("server.clear")}
          </Button>
        </Flex>
      )}

      <Box
        ref={containerRef}
        style={{
          backgroundColor: "var(--gray-2)",
          borderRadius: "var(--radius-3)",
          padding: "1rem",
          fontFamily: "monospace",
          fontSize: "0.9rem",
          height,
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
    </Flex>
  );
}
