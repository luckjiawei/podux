import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useLanguage } from "../contexts/LanguageContext";

interface LanguageToggleProps {
  language?: "en" | "zh";
  onChange?: (lang: "en" | "zh") => void;
}

export function LanguageToggle({ language: customLanguage, onChange }: LanguageToggleProps = {}) {
  const context = useLanguage();

  // Use custom language/onChange if provided, otherwise use context
  const language = customLanguage ?? context.language;
  const setLanguage = onChange ?? context.setLanguage;

  const toggleLanguage = () => {
    const newLang = language === "en" ? "zh" : "en";
    setLanguage(newLang);
  };

  return (
    <motion.div
      className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-[var(--gray-a3)]"
      onClick={toggleLanguage}
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
            key={language}
            initial={{ rotate: -90, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            exit={{ rotate: 90, scale: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Icon
              icon={language === "en" ? "circle-flags:us" : "circle-flags:cn"}
              width="20"
              height="20"
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
