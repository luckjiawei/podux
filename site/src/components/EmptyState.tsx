import { Box, Flex, Text, Button } from "@radix-ui/themes";
import React from "react";
import { Icon } from "@iconify/react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string | React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionText, onAction }: EmptyStateProps) {
  return (
    <Box py="9" px="4">
      <Flex direction="column" align="center" justify="center" gap="4">
        <Box
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, var(--gray-3) 0%, var(--gray-5) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--gray-11)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          {icon || <Icon icon="lucide:inbox" width="32" height="32" />}
        </Box>
        <Flex direction="column" align="center" gap="1">
          <Text size="4" weight="bold" highContrast>
            {title}
          </Text>
          <Text size="2" color="gray" align="center" style={{ maxWidth: "400px" }}>
            {description}
          </Text>
        </Flex>
        {actionText && onAction && (
          <Button
            variant="soft"
            size="3"
            onClick={onAction}
            style={{ cursor: "pointer", marginTop: "8px" }}
          >
            <Icon icon="lucide:plus" />
            {actionText}
          </Button>
        )}
      </Flex>
    </Box>
  );
}
