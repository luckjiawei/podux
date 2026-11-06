import { useEffect, useState } from "react";
import { Badge, Button, Card, Flex, Table, Text } from "@radix-ui/themes";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { useVisitors } from "./useVisitors";

export function VisitorsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { visitors, loading, refresh, toggle, remove } = useVisitors();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Flex direction="column" gap="5" className="flex flex-1 flex-col">
      <PageHeader
        title={t("visitor.title")}
        description={t("visitor.description")}
        visible={mounted}
      />
      <Card className="flex flex-1 flex-col">
        <Flex justify="between" align="center" mb="4" wrap="wrap" gap="2">
          <Text size="3" weight="bold">
            {t("visitor.allVisitors")}
          </Text>
          <Flex gap="2">
            <Button variant="soft" onClick={refresh}>
              <Icon icon="lucide:refresh-cw" />
              {t("proxy.refresh")}
            </Button>
            <Button onClick={() => navigate("/visitors/new")}>
              <Icon icon="lucide:plus" />
              {t("visitor.addVisitor")}
            </Button>
          </Flex>
        </Flex>
        {!loading && visitors.length === 0 ? (
          <EmptyState
            title={t("visitor.noVisitors")}
            description={t("visitor.noVisitorsDesc")}
            actionText={t("visitor.addVisitor")}
            onAction={() => navigate("/visitors/new")}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>{t("common.name")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("visitor.client")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("visitor.target")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("visitor.localEndpoint")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("visitor.protocol")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("server.status")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("common.status")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("common.actions")}</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {visitors.map((visitor) => (
                  <Table.Row key={visitor.id}>
                    <Table.Cell>
                      <Text weight="medium">{visitor.name}</Text>
                    </Table.Cell>
                    <Table.Cell>{visitor.expand?.serverId?.serverName || "-"}</Table.Cell>
                    <Table.Cell>
                      {visitor.expand?.targetProxyId?.name || visitor.serverName || "-"}
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="2">
                        {visitor.bindAddr || "127.0.0.1"}:{visitor.bindPort}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="surface">{visitor.protocol.toUpperCase()}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        color={
                          visitor.expand?.serverId?.bootStatus === "running" ? "green" : "gray"
                        }
                      >
                        {visitor.expand?.serverId?.bootStatus === "running"
                          ? t("server.running")
                          : t("server.stopped")}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        size="1"
                        variant="soft"
                        color={visitor.status === "enabled" ? "green" : "gray"}
                        onClick={() => toggle(visitor)}
                      >
                        {visitor.status === "enabled" ? t("proxy.enabled") : t("proxy.disabled")}
                      </Button>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2">
                        <Button
                          size="1"
                          variant="soft"
                          onClick={() => navigate(`/visitors/${visitor.id}/edit`)}
                        >
                          <Icon icon="lucide:pencil" />
                          {t("common.edit")}
                        </Button>
                        <Button
                          size="1"
                          variant="soft"
                          color="red"
                          onClick={() => remove(visitor.id)}
                        >
                          <Icon icon="lucide:trash-2" />
                          {t("common.delete")}
                        </Button>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </div>
        )}
      </Card>
    </Flex>
  );
}

export default VisitorsPage;
