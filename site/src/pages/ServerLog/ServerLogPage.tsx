import { useParams, useNavigate } from "react-router-dom";
import { Button, Card, Flex, Heading } from "@radix-ui/themes";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../components/PageHeader";
import { ServerLogViewer } from "../../components/ServerLogViewer";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export function ServerLogPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Flex direction="column" gap="5">
      <PageHeader
        title={t("server.connectionLogs")}
        description={t("server.viewLogsDesc")}
        visible={mounted}
        extra={
          <Button variant="soft" onClick={() => navigate("/servers")}>
            <Icon icon="lucide:arrow-left" width="16" height="16" />
            {t("server.backToServers")}
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <Card size="3">
          <ServerLogViewer serverId={id!} height="calc(100vh - 280px)" showHeading={false} />
        </Card>
      </motion.div>
    </Flex>
  );
}
