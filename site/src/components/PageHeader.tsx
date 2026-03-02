import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  extra?: ReactNode;
  visible?: boolean;
}

export function PageHeader({ title, description, extra, visible = true }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Flex justify="between" align="center">
        <Box>
          <Heading size="6">{title}</Heading>
          {description && (
            <Text color="gray" size="2">
              {description}
            </Text>
          )}
        </Box>
        {extra && <Box>{extra}</Box>}
      </Flex>
    </motion.div>
  );
}
