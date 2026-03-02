import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useTheme } from "../contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.div
      className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-[var(--gray-a3)]"
      onClick={toggleTheme}
      whileTap={{ scale: 0.95 }}
      whileHover="hover"
    >
      <motion.div
        variants={{
          hover: { scale: 1.1, rotate: 15 },
        }}
        className="flex items-center justify-center"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={theme}
            initial={{ rotate: -90, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            exit={{ rotate: 90, scale: 0 }}
            transition={{ duration: 0.2 }}
          >
            {theme === "light" ? (
              <Icon icon="lucide:sun" width="20" height="20" color="#f59e0b" />
            ) : (
              <Icon icon="lucide:moon" width="20" height="20" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
