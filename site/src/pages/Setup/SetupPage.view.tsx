import { useState } from "react";
import { Button, Callout, Flex, Heading, Text, TextField, Select } from "@radix-ui/themes";
import { AnimatePresence, motion } from "framer-motion";
import { PageTransition } from "../../components/PageTransition";
import { Loading } from "../../components/Loading";
import { ThemeToggle } from "../../components/ThemeToggle";
import { LanguageToggle } from "../../components/LanguageToggle";
import { Icon } from "@iconify/react";
import logo from "../../assets/logo.png";
import { useTranslation } from "react-i18next";

interface SetupViewProps {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  language: "en" | "zh";
  handleLanguageChange: (lang: "en" | "zh") => void;
  loading: boolean;
  error: string;
  handleSubmit: (e: React.FormEvent) => void;
  checking: boolean;
}

export function SetupView({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  language,
  handleLanguageChange,
  loading,
  error,
  handleSubmit,
  checking,
}: SetupViewProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (checking) {
    return <Loading fullscreen />;
  }

  if (loading) {
    return <Loading fullscreen text={t("setup.initializing", "Initializing...")} />;
  }

  return (
    <PageTransition>
      <Flex
        align="center"
        justify="center"
        className="relative min-h-screen"
        style={{ backgroundColor: "var(--gray-2)" }}
      >
        {/* Theme & Language Toggle Buttons */}
        <Flex gap="2" className="absolute top-4 right-4">
          <ThemeToggle />
          <LanguageToggle language={language} onChange={handleLanguageChange} />
        </Flex>

        {/* Setup Form */}
        <form onSubmit={handleSubmit} style={{ width: "420px" }}>
          <Flex direction="column" gap="3">
            {/* Logo & Title */}
            <Flex direction="column" align="center" gap="2">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <Flex align="center" gap="3">
                  <motion.img
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.1,
                    }}
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    whileTap={{ scale: 0.95 }}
                    src={logo}
                    alt="Frpc Hub Logo"
                    className="h-16 w-16 cursor-pointer rounded-2xl object-contain"
                  />
                  <Heading size="6">Frpc Hub</Heading>
                </Flex>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Heading size="4" align="center">
                  {t("setup.title", "System Initialization")}
                </Heading>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Text color="gray" size="2" align="center">
                  {t("setup.description", "Set up the administrator account and default language")}
                </Text>
              </motion.div>
            </Flex>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1, x: [0, -5, 5, -5, 5, 0] }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  <Callout.Root color="red">
                    <Callout.Icon>
                      <Icon icon="lucide:alert-circle" />
                    </Callout.Icon>
                    <Callout.Text>{error}</Callout.Text>
                  </Callout.Root>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Language Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <Flex direction="column" gap="1">
                <Text as="label" size="3" weight="medium">
                  {t("setup.language", "Default Language")}
                </Text>
                <Select.Root value={language} onValueChange={handleLanguageChange}>
                  <Select.Trigger className="w-full" />
                  <Select.Content>
                    <Select.Item value="en">
                      <Flex align="center" gap="2">
                        <Icon icon="circle-flags:us" width="16" />
                        {t("language.en", "English")}
                      </Flex>
                    </Select.Item>
                    <Select.Item value="zh">
                      <Flex align="center" gap="2">
                        <Icon icon="circle-flags:cn" width="16" />
                        {t("language.zh", "中文")}
                      </Flex>
                    </Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
            </motion.div>

            {/* Email Field */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <Flex direction="column" gap="1">
                <Text as="label" size="3" weight="medium">
                  {t("setup.adminEmail", "Administrator Email")}
                </Text>
                <TextField.Root
                  size="3"
                  placeholder={t("setup.enterAdminEmail", "Enter admin email")}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                >
                  <TextField.Slot>
                    <Icon icon="lucide:mail" />
                  </TextField.Slot>
                </TextField.Root>
              </Flex>
            </motion.div>

            {/* Password Field */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
            >
              <Flex direction="column" gap="1">
                <Text as="label" size="3" weight="medium">
                  {t("setup.password", "Password")}
                </Text>
                <TextField.Root
                  size="3"
                  placeholder={t("setup.enterPassword", "At least 8 characters")}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                >
                  <TextField.Slot>
                    <Icon icon="lucide:key-round" />
                  </TextField.Slot>
                  <TextField.Slot>
                    <Icon
                      icon={showPassword ? "lucide:eye-off" : "lucide:eye"}
                      style={{ cursor: "pointer" }}
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </TextField.Slot>
                </TextField.Root>
              </Flex>
            </motion.div>

            {/* Confirm Password Field */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.4 }}
            >
              <Flex direction="column" gap="1">
                <Text as="label" size="3" weight="medium">
                  {t("setup.confirmPassword", "Confirm Password")}
                </Text>
                <TextField.Root
                  size="3"
                  placeholder={t("setup.enterPasswordAgain", "Enter password again")}
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                >
                  <TextField.Slot>
                    <Icon icon="lucide:key-round" />
                  </TextField.Slot>
                  <TextField.Slot>
                    <Icon
                      icon={showConfirmPassword ? "lucide:eye-off" : "lucide:eye"}
                      style={{ cursor: "pointer" }}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  </TextField.Slot>
                </TextField.Root>
              </Flex>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full"
            >
              <Button size="3" type="submit" className="!w-full cursor-pointer">
                <Icon icon="lucide:check-circle" />
                {t("setup.complete", "Complete Setup")}
              </Button>
            </motion.div>
          </Flex>
        </form>
      </Flex>
    </PageTransition>
  );
}
