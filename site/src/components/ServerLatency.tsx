import { Flex, Text, Badge } from "@radix-ui/themes";
import { Icon } from "@iconify/react";

interface NetworkStatus {
  reachable: boolean;
  latency: number;
}

interface ServerLatencyProps {
  networkStatus?: NetworkStatus;
  size?: "1" | "2" | "3";
}

export function ServerLatency({ networkStatus, size = "2" }: ServerLatencyProps) {
  if (!networkStatus) {
    return (
      <Text size={size} color="gray">
        -
      </Text>
    );
  }

  if (!networkStatus.reachable) {
    return (
      <Badge color="gray" variant="soft">
        <Icon icon="lucide:x" width="12" height="12" />
        Unreachable
      </Badge>
    );
  }

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return "var(--green-11)";
    if (latency < 150) return "var(--amber-11)";
    return "var(--red-11)";
  };

  const color = getLatencyColor(networkStatus.latency);

  return (
    <Flex align="center" gap="1">
      <Icon icon="lucide:zap" width="14" height="14" color={color} />
      <Text size={size} weight="medium" style={{ color }}>
        {networkStatus.latency}ms
      </Text>
    </Flex>
  );
}
