import { Box, Card, Flex, Text } from "@radix-ui/themes";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../components/PageHeader";
import { Icon } from "@iconify/react";
import { ProfileSettings } from "./ProfileSettings";
import { GeneralSettings } from "./GeneralSettings";
import "./SettingsPage.css";

export function SettingsView() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "general");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <>
      <Box className="settings-container">
        {/* Header Section */}
        <Box mb="6">
          <PageHeader title={t("settings.title")} description={t("settings.manageWorkspace")} />
        </Box>

        {/* Main Interface */}
        <Card size="3" className="settings-card">
          <Flex>
            {/* Modern Navigation Sidebar */}
            <Box className="settings-sidebar">
              <Flex direction="column" gap="2" className="settings-nav">
                <button
                  className="nav-item"
                  data-state={activeTab === "general" ? "active" : "inactive"}
                  onClick={() => handleTabChange("general")}
                >
                  <Flex align="center" gap="3">
                    <Icon icon="lucide:settings" width="18" height="18" />
                    <Text size="2" weight="medium">
                      {t("settings.general")}
                    </Text>
                  </Flex>
                </button>
                <button
                  className="nav-item"
                  data-state={activeTab === "profile" ? "active" : "inactive"}
                  onClick={() => handleTabChange("profile")}
                >
                  <Flex align="center" gap="3">
                    <Icon icon="lucide:user" width="18" height="18" />
                    <Text size="2" weight="medium">
                      {t("settings.profile")}
                    </Text>
                  </Flex>
                </button>
              </Flex>
            </Box>

            {/* Content Area */}
            <Box className="settings-content">
              <AnimatePresence mode="wait">
                {activeTab === "general" && (
                  <motion.div
                    key="general"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <GeneralSettings />
                  </motion.div>
                )}
                {activeTab === "profile" && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <ProfileSettings />
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          </Flex>
        </Card>
      </Box>
    </>
  );
}
