import { type ReactNode } from "react";
import { Text, Box } from "@radix-ui/themes";
import { motion, AnimatePresence } from "framer-motion";

interface FormItemProps {
  label: string;
  error?: string;
  required?: boolean;
  animate?: boolean;
  children: ReactNode;
}

function FormItem({ label, error, required, animate, children }: FormItemProps) {
  const content = (
    <Box>
      <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
        {label} {required && <Text color="red">*</Text>}
      </Text>
      {children}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Text color="red" size="1" mt="1" style={{ display: "block" }}>
              {error}
            </Text>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        style={{ overflow: "hidden" }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export { FormItem, type FormItemProps };
