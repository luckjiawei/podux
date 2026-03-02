import { Box, Card, Flex, Text } from "@radix-ui/themes";
import React from "react";

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = "gray",
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "green" | "red" | "blue" | "orange" | "gray";
}) {
  const colorMap = {
    green: "var(--green-9)",
    red: "var(--red-9)",
    blue: "var(--blue-9)",
    orange: "var(--orange-9)",
    gray: "var(--gray-9)",
  };

  return (
    <Card className="flex-1">
      <Flex gap="4" align="center">
        <Flex
          className="h-12 w-12 rounded-xl select-none"
          align="center"
          justify="center"
          style={{
            backgroundColor: `${colorMap[color]}20`,
            color: colorMap[color],
          }}
        >
          {icon}
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            {title}
          </Text>
          <Box>
            <Text size="6" weight="bold">
              {value}
            </Text>
          </Box>
          {subtitle && (
            <Text size="1" color="gray">
              {subtitle}
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
