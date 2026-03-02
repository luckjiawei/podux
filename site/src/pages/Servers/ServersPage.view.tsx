import {
  Button,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Table,
  TextField,
  AlertDialog,
} from "@radix-ui/themes";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimateNumber } from "../../components/AnimateNumber";
import { EmptyState } from "../../components/EmptyState";
import { AddServerDialog } from "./AddServerDialog";
import type { ServerFormData } from "./AddServerDialog";
import type { Server, CreateServerForm } from "./useServers";
import { PageHeader } from "../../components/PageHeader";
import { Loading } from "../../components/Loading";
import { StatCard } from "../../components/StatCard";
import { ServerLatency } from "../../components/ServerLatency";
import { ServerLocation } from "../../components/ServerLocation";
import { useTranslation } from "react-i18next";

interface ServersViewProps {
  servers: Server[];
  loading?: boolean;
  refreshing: boolean;
  isDialogOpen: boolean;
  formData: CreateServerForm;
  submitting: boolean;
  editingServer: Server | null;
  openDialog: (server?: Server) => void;
  closeDialog: () => void;
  updateFormField: (field: keyof CreateServerForm, value: string | number) => void;
  createServer: (data?: CreateServerForm) => Promise<void>;
  updateServer: (id: string, data: CreateServerForm) => Promise<void>;
  deleteServer: (id: string) => void;
  launchServer: (id: string) => void;
  terminateServer: (id: string) => void;
  search: string;
  setSearch: (value: string) => void;
  refreshServers: () => void;
}

export function ServersView({
  servers,
  loading,
  refreshing,
  isDialogOpen,
  // formData,
  // submitting,
  editingServer,
  openDialog,
  closeDialog,
  // updateFormField,
  createServer,
  updateServer,
  deleteServer,
  launchServer,
  terminateServer,
  search,
  setSearch,
  refreshServers,
}: ServersViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "green";
      case "stopped":
        return "red";
      default:
        return "gray";
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Wait for PageTransition to complete before triggering animations
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async (data: ServerFormData) => {
    if (editingServer) {
      await updateServer(editingServer.id, data);
    } else {
      await createServer(data);
    }
  };

  return (
    <>
      <AddServerDialog
        open={isDialogOpen}
        onOpenChange={(open) => !open && closeDialog()}
        onSubmit={handleSave}
        initialData={editingServer as any}
      />

      <Flex direction="column" gap="5" className="flex flex-1 flex-col">
        {/* Header */}
        <PageHeader
          title={t("server.title")}
          description={t("server.manageServers")}
          visible={mounted}
        />
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            <StatCard
              title={t("server.totalServers")}
              value={<AnimateNumber value={servers.length} decimalPlaces={0} />}
              color="gray"
              icon={<Icon icon="lucide:hard-drive" width="32" height="32" color="var(--gray-11)" />}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            <StatCard
              title={t("server.running")}
              value={
                <span className="text-[#30A46C]">
                  <AnimateNumber
                    value={servers.filter((s) => s.bootStatus === "running").length}
                    decimalPlaces={0}
                  />
                </span>
              }
              color="green"
              icon={<Icon icon="lucide:rocket" width="32" height="32" color="var(--green-11)" />}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          >
            <StatCard
              title={t("server.stopped")}
              value={
                <span className="text-[#E5484D]">
                  <AnimateNumber
                    value={servers.filter((s) => s.bootStatus === "stopped").length}
                    decimalPlaces={0}
                  />
                </span>
              }
              color="red"
              icon={<Icon icon="lucide:bug" width="32" height="32" color="var(--red-11)" />}
            />
          </motion.div>
        </div>
        {/* Servers Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <Card className="flex flex-1 flex-col">
            <Flex direction="column" gap="3" mb="4" p="2">
              <Flex justify="between" align="center" wrap="wrap" gap="2">
                <Text size="3" weight="bold">
                  {t("server.allServers")}
                </Text>
                <Flex gap="2" wrap="wrap" align="center">
                  <TextField.Root
                    size="2"
                    placeholder={t("server.searchServers")}
                    className="min-w-32 flex-1"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  >
                    <TextField.Slot>
                      <Icon icon="lucide:search" width="16" height="16" />
                    </TextField.Slot>
                    {search && (
                      <TextField.Slot
                        pr="2"
                        onClick={() => setSearch("")}
                        style={{ cursor: "pointer" }}
                      >
                        <Icon icon="lucide:x" width="16" height="16" />
                      </TextField.Slot>
                    )}
                  </TextField.Root>
                  <Button variant="soft" onClick={refreshServers} disabled={refreshing}>
                    <Icon
                      icon="lucide:refresh-cw"
                      width="14"
                      height="14"
                      className={refreshing ? "animate-spin" : ""}
                    />
                    {t("server.refresh")}
                  </Button>
                  <Button variant="soft" color="gray" onClick={() => navigate("/import")}>
                    <Icon icon="lucide:file-input" width="16" height="16" />
                    {t("import.title")}
                  </Button>
                  <Button onClick={() => openDialog()}>
                    <Icon icon="lucide:plus" width="14" height="14" />
                    {t("server.addServer")}
                  </Button>
                </Flex>
              </Flex>
            </Flex>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1"
                >
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    gap="2"
                    className="h-full py-12"
                  >
                    <Loading size="small"></Loading>
                  </Flex>
                </motion.div>
              ) : servers.length === 0 ? (
                search ? (
                  <motion.div
                    key="no-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1"
                  >
                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      gap="2"
                      className="h-full"
                    >
                      <Icon icon="lucide:search" width="32" height="32" color="gray" />
                      <Heading size="4">{t("server.noResultsFound")}</Heading>
                      <Text color="gray" size="2">
                        {t("server.noServersMatch")} "{search}"
                      </Text>
                      <Button variant="soft" mt="2" onClick={() => setSearch("")}>
                        {t("server.clearSearch")}
                      </Button>
                    </Flex>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1"
                  >
                    <Flex direction="column" align="center" justify="center" className="h-full">
                      <EmptyState
                        title={t("server.noServers")}
                        description={t("server.addFirstServer")}
                        actionText={t("server.addYourFirstServer")}
                        onAction={() => openDialog()}
                      />
                    </Flex>
                  </motion.div>
                )
              ) : (
                <motion.div
                  key="table"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="overflow-x-auto">
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>{t("common.name")}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t("server.host")}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t("server.port")}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t("server.latency")}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t("server.location")}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t("server.bootStatus")}</Table.ColumnHeaderCell>

                        <Table.ColumnHeaderCell>{t("common.actions")}</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {servers.map((server) => (
                        <Table.Row key={server.id}>
                          <Table.Cell>
                            <Link
                              to={`/servers/${server.id}`}
                              style={{
                                textDecoration: "none",
                                color: "inherit",
                              }}
                            >
                              <Text weight="medium" className="cursor-pointer hover:underline">
                                {server.serverName}
                              </Text>
                            </Link>
                          </Table.Cell>
                          <Table.Cell>
                            <Text size="2" className="font-mono">
                              {server.serverAddr}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant="surface">{server.serverPort}</Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <ServerLatency networkStatus={server.networkStatus} />
                          </Table.Cell>
                          <Table.Cell>
                            <ServerLocation geoLocation={server.geoLocation} />
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              radius="full"
                              color={getStatusColor(server.bootStatus)}
                              className={`animate-status-appear ${
                                server.bootStatus === "running"
                                  ? "animate-status-pulse"
                                  : server.bootStatus === "stopped"
                                    ? "animate-status-fade"
                                    : ""
                              }`}
                            >
                              <span
                                className={`status-dot ${
                                  server.bootStatus === "running"
                                    ? "status-dot-green"
                                    : server.bootStatus === "stopped"
                                      ? "status-dot-red"
                                      : "status-dot-gray"
                                }`}
                              />
                              {server.bootStatus === "running"
                                ? t("server.running")
                                : server.bootStatus === "stopped"
                                  ? t("server.stopped")
                                  : t("common.status")}
                            </Badge>
                          </Table.Cell>

                          <Table.Cell>
                            <Flex gap="2">
                              {server.bootStatus === "running" ? (
                                <Button
                                  size="1"
                                  variant="soft"
                                  className="cursor-pointer"
                                  color="red"
                                  onClick={() => {
                                    terminateServer(server.id);
                                  }}
                                >
                                  <Icon icon="lucide:bug" width="14" height="14" />
                                  {t("server.stop")}
                                </Button>
                              ) : (
                                <Button
                                  size="1"
                                  variant="soft"
                                  className="cursor-pointer"
                                  color="green"
                                  onClick={() => launchServer(server.id)}
                                >
                                  <Icon icon="lucide:rocket" width="14" height="14" />
                                  {t("server.launch")}
                                </Button>
                              )}

                              <Link to={`/servers/${server.id}`} style={{ textDecoration: "none" }}>
                                <Button
                                  size="1"
                                  variant="soft"
                                  className="cursor-pointer"
                                  color="blue"
                                >
                                  <Icon icon="lucide:eye" width="14" height="14" />
                                  {t("server.view")}
                                </Button>
                              </Link>

                              <Button
                                size="1"
                                variant="soft"
                                className="cursor-pointer"
                                onClick={() => openDialog(server)}
                              >
                                <Icon icon="lucide:pencil" width="14" height="14" />
                                {t("common.edit")}
                              </Button>

                              <Button
                                size="1"
                                variant="soft"
                                className="cursor-pointer"
                                color="red"
                                onClick={() => setDeleteId(server.id)}
                              >
                                <Icon icon="lucide:trash" width="14" height="14" />
                                {t("common.delete")}
                              </Button>
                            </Flex>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </Flex>

      <AlertDialog.Root open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>{t("server.confirmDeletion")}</AlertDialog.Title>
          <AlertDialog.Description size="2">
            {t("server.deleteConfirmMessage")}
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                {t("common.cancel")}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                variant="solid"
                color="red"
                onClick={() => {
                  if (deleteId) {
                    deleteServer(deleteId);
                    setDeleteId(null);
                  }
                }}
              >
                {t("common.delete")}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}
