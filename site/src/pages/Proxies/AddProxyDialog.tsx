import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  Box,
  Separator,
  IconButton,
  Switch,
  TextArea,
  Tabs,
  Select,
  AlertDialog,
  Callout,
} from "@radix-ui/themes";
import { REGEX } from "../../lib/regex";
import pb from "../../lib/pocketbase";
import { toast } from "sonner";
import { useEffect } from "react";
import { FormItem } from "../../components/FormItem";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

interface AddProxyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: ProxyFormData) => Promise<void>;
  initialData?: ProxyFormData | null;
}

export interface ProxyFormData {
  serverId: string;
  name: string;
  type: "tcp" | "udp" | "http" | "https" | "stcp" | "xtcp";
  localIp: string;
  localPort: string;
  remotePort: string;
  customDomains?: string;
  subdomain?: string;
  encryption: boolean;
  compression: boolean;
  description?: string;
}

const proxyTypes = [
  {
    value: "tcp",
    label: "TCP",
    description: "TCP Port Forwarding",
  },
  {
    value: "udp",
    label: "UDP",
    description: "UDP Port Forwarding",
  },
  {
    value: "http",
    label: "HTTP",
    description: "HTTP Reverse Proxy",
  },
  {
    value: "https",
    label: "HTTPS",
    description: "HTTPS Reverse Proxy",
  },
  {
    value: "stcp",
    label: "STCP",
    description: "Secure TCP Tunnel",
    disabled: true,
  },
  {
    value: "xtcp",
    label: "XTCP",
    description: "P2P TCP Tunnel",
    disabled: true,
  },
];

export function AddProxyDialog({ open, onOpenChange, onSubmit, initialData }: AddProxyDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // @ts-ignore
  const [loading, setLoading] = useState(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);

  const [formData, setFormData] = useState<ProxyFormData>({
    serverId: "",
    name: "",
    type: "tcp",
    localIp: "127.0.0.1",
    localPort: "",
    remotePort: "",
    customDomains: "",
    subdomain: "",
    encryption: false,
    compression: false,
    description: "",
  });

  useEffect(() => {
    if (open && initialData) {
      setFormData(initialData);
    } else if (open && !initialData) {
      setFormData({
        serverId: servers.length > 0 ? servers[0].id : "",
        name: "",
        type: "tcp",
        localIp: "127.0.0.1",
        localPort: "",
        remotePort: "",
        customDomains: "",
        subdomain: "",
        encryption: false,
        compression: false,
        description: "",
      });
    }
  }, [open, initialData]);

  const [servers, setServers] = useState<{ id: string; serverName: string }[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  // @ts-ignore
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchServers = async () => {
        try {
          setLoadingServers(true);
          const records = await pb.collection("fh_servers").getFullList({
            sort: "-created",
            fields: "id,serverName",
          });
          setServers(records.map((r) => ({ id: r.id, serverName: r.serverName })));
          if (records.length > 0 && !formData.serverId) {
            setFormData((prev) => ({ ...prev, serverId: records[0].id }));
          }
        } catch (err) {
          console.error("Failed to fetch servers:", err);
          toast.error("Failed to fetch servers");
        } finally {
          setLoadingServers(false);
        }
      };
      fetchServers();
    }
  }, [open]);

  const [errors, setErrors] = useState<Partial<Record<keyof ProxyFormData, string>>>({});

  const [activeTab, setActiveTab] = useState("basic");

  const handleChange = (field: keyof ProxyFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Validate on change
    if (typeof value === "string") {
      validateField(field, value);
    }
  };

  const validateField = (field: keyof ProxyFormData, value: string) => {
    let error = "";
    if (value) {
      switch (field) {
        case "name":
          if (!REGEX.PROXY_NAME.test(value)) {
            error = t("proxy.errorInvalidName");
          }
          break;
        case "localIp":
          if (!REGEX.IP_OR_HOSTNAME.test(value)) {
            error = t("proxy.errorInvalidIP");
          }
          break;
        case "localPort":
        case "remotePort":
          if (!REGEX.PORT.test(value)) {
            error = t("proxy.errorInvalidPort");
          }
          break;
      }
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await onSubmit?.(formData);
      onOpenChange(false);
      // Reset form
      setFormData({
        serverId: servers.length > 0 ? servers[0].id : "",
        name: "",
        type: "tcp",
        localIp: "127.0.0.1",
        localPort: "",
        remotePort: "",
        customDomains: "",
        subdomain: "",
        encryption: false,
        compression: false,
        description: "",
      });
      setErrors({});
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to add proxy");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Check if form has unsaved changes
      const initialFormData = initialData || {
        serverId: servers.length > 0 ? servers[0].id : "",
        name: "",
        type: "tcp",
        localIp: "127.0.0.1",
        localPort: "",
        remotePort: "",
        customDomains: "",
        subdomain: "",
        encryption: false,
        compression: false,
        description: "",
      };

      const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);
      if (isDirty) {
        setShowDiscardAlert(true);
        return;
      }
    }
    onOpenChange(newOpen);
  };

  const confirmDiscard = () => {
    setShowDiscardAlert(false);
    onOpenChange(false);
  };

  const isHttpType = formData.type === "http" || formData.type === "https";

  const isEditing = !!initialData;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Content
          style={{
            maxWidth: 520,
            background: "linear-gradient(145deg, var(--gray-1) 0%, var(--gray-2) 100%)",
            border: "1px solid var(--gray-4)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          {/* Header */}
          <Flex justify="between" align="center" mb="4">
            <Flex align="center" gap="3">
              <Box
                style={{
                  background: "linear-gradient(135deg, var(--accent-9) 0%, var(--accent-10) 100%)",
                  padding: "10px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon icon="lucide:network" width="20" height="20" color="white" />
              </Box>
              <Box>
                <Dialog.Title size="5" weight="bold" mb="0">
                  {initialData ? t("proxy.editProxy") : t("proxy.addProxy")}
                </Dialog.Title>
                <Text size="1" color="gray">
                  {initialData ? t("proxy.updateProxyDesc") : t("proxy.addProxyDesc")}
                </Text>
              </Box>
            </Flex>
            <Dialog.Close>
              <IconButton variant="ghost" color="gray" radius="full">
                <Icon icon="lucide:x" width="16" height="16" />
              </IconButton>
            </Dialog.Close>
          </Flex>

          <Separator size="4" mb="4" />

          {/* Tabs */}
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List size="2" mb="4">
              <Tabs.Trigger value="basic">{t("proxy.basicConfig")}</Tabs.Trigger>
              <Tabs.Trigger value="advanced">{t("proxy.advancedOptions")}</Tabs.Trigger>
            </Tabs.List>
            <AnimatePresence mode="wait">
              {/* Basic Tab */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Tabs.Content value="basic">
                  <Flex direction="column" gap="4">
                    {/* Server Selection */}
                    <FormItem label={t("proxy.selectServer")} required>
                      <Select.Root
                        value={formData.serverId}
                        onValueChange={(value) => handleChange("serverId", value)}
                        disabled={loadingServers || servers.length === 0}
                      >
                        <Select.Trigger
                          placeholder={
                            loadingServers
                              ? t("common.loading")
                              : servers.length === 0
                                ? t("proxy.noServersAvailable")
                                : t("proxy.selectServerPlaceholder")
                          }
                          style={{ width: "100%" }}
                        />
                        <Select.Content>
                          {servers.map((server) => (
                            <Select.Item key={server.id} value={server.id}>
                              {server.serverName}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                      {servers.length === 0 && !loadingServers && (
                        <Callout.Root size="1" color="orange" mt="2">
                          <Callout.Icon>
                            <Icon icon="lucide:triangle-alert" width="14" height="14" />
                          </Callout.Icon>
                          <Callout.Text>
                            <Flex align="center" justify="between" gap="2">
                              <Text size="1">{t("proxy.noServersAvailable")}</Text>
                              <Button
                                size="1"
                                variant="ghost"
                                color="orange"
                                style={{ cursor: "pointer", flexShrink: 0 }}
                                onClick={() => {
                                  onOpenChange(false);
                                  navigate("/servers");
                                }}
                              >
                                {t("proxy.goAddServer")}
                                <Icon icon="lucide:arrow-right" width="12" height="12" />
                              </Button>
                            </Flex>
                          </Callout.Text>
                        </Callout.Root>
                      )}
                    </FormItem>

                    {/* Proxy Name */}
                    <FormItem label={t("proxy.proxyName")} required error={errors.name}>
                      <TextField.Root
                        size="2"
                        placeholder={t("proxy.proxyNamePlaceholder")}
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        color={errors.name ? "red" : undefined}
                      />
                    </FormItem>

                    {/* Proxy Type Selection */}
                    <FormItem label={t("proxy.proxyType")} required>
                      <Flex gap="2" wrap="wrap">
                        {proxyTypes.map((type) => (
                          <Box
                            key={type.value}
                            onClick={() =>
                              !type.disabled &&
                              handleChange("type", type.value as ProxyFormData["type"])
                            }
                            className={`box-border min-w-[64px] rounded-lg border-2 px-3 py-2 text-center transition-all duration-200 ${
                              type.disabled
                                ? "cursor-not-allowed opacity-50"
                                : "cursor-pointer opacity-100"
                            } ${
                              formData.type === type.value
                                ? "border-[var(--accent-9)] bg-[var(--accent-3)]"
                                : "border-[var(--gray-5)] bg-[var(--gray-2)]"
                            }`}
                          >
                            <Text
                              size="1"
                              weight={formData.type === type.value ? "bold" : "regular"}
                              color={
                                type.disabled
                                  ? "gray"
                                  : formData.type === type.value
                                    ? "blue"
                                    : "gray"
                              }
                            >
                              {type.label}
                            </Text>
                          </Box>
                        ))}
                      </Flex>
                    </FormItem>

                    {/* Local Settings */}
                    <Flex gap="3">
                      <Box style={{ flex: 2 }}>
                        <FormItem label={t("proxy.localAddress")} required error={errors.localIp}>
                          <TextField.Root
                            size="2"
                            placeholder={t("proxy.localAddressPlaceholder")}
                            value={formData.localIp}
                            onChange={(e) => handleChange("localIp", e.target.value)}
                            color={errors.localIp ? "red" : undefined}
                          />
                        </FormItem>
                      </Box>
                      <Box style={{ flex: 1 }}>
                        <FormItem label={t("proxy.localPort")} required error={errors.localPort}>
                          <TextField.Root
                            size="2"
                            placeholder={t("proxy.localPortPlaceholder")}
                            type="number"
                            value={formData.localPort}
                            onChange={(e) => handleChange("localPort", e.target.value)}
                            color={errors.localPort ? "red" : undefined}
                          />
                        </FormItem>
                      </Box>
                    </Flex>

                    {/* Remote Port or Custom Domains */}
                    {isHttpType ? (
                      <>
                        <FormItem label={t("proxy.customDomainsLabel")}>
                          <TextField.Root
                            size="2"
                            placeholder={t("proxy.customDomainsPlaceholder")}
                            value={formData.customDomains}
                            onChange={(e) => handleChange("customDomains", e.target.value)}
                          />
                          <Text size="1" color="gray" mt="1">
                            {t("proxy.customDomainsDesc")}
                          </Text>
                        </FormItem>
                        <FormItem label={t("proxy.subdomain")}>
                          <TextField.Root
                            size="2"
                            placeholder={t("proxy.subdomainPlaceholder")}
                            value={formData.subdomain}
                            onChange={(e) => handleChange("subdomain", e.target.value)}
                          />
                          <Text size="1" color="gray" mt="1">
                            {t("proxy.subdomainDesc")}
                          </Text>
                        </FormItem>
                      </>
                    ) : (
                      <FormItem
                        label={t("proxy.remotePortLabel")}
                        required
                        error={errors.remotePort}
                      >
                        <TextField.Root
                          size="2"
                          placeholder={t("proxy.remotePortPlaceholder")}
                          type="number"
                          value={formData.remotePort}
                          onChange={(e) => handleChange("remotePort", e.target.value)}
                          color={errors.remotePort ? "red" : undefined}
                        />
                        <Text size="1" color="gray" mt="1">
                          {t("proxy.remotePortDesc")}
                        </Text>
                      </FormItem>
                    )}
                    {/* Description */}
                    <FormItem label={t("proxy.descriptionLabel")}>
                      <TextArea
                        size="2"
                        placeholder={t("proxy.descriptionPlaceholder")}
                        value={formData.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        style={{ minHeight: "80px" }}
                      />
                    </FormItem>
                  </Flex>
                </Tabs.Content>
              </motion.div>
              {/* Advanced Tab */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Tabs.Content value="advanced">
                  <Flex direction="column" gap="4">
                    {/* Encryption & Compression */}
                    <Box
                      style={{
                        background: "var(--gray-2)",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid var(--gray-4)",
                      }}
                    >
                      <Flex justify="between" align="center" mb="3">
                        <Box>
                          <Text size="2" weight="medium">
                            {t("proxy.transportEncryption")}
                          </Text>
                          <Text size="1" color="gray">
                            {t("proxy.transportEncryptionDesc")}
                          </Text>
                        </Box>
                        <Switch
                          size="2"
                          checked={formData.encryption}
                          onCheckedChange={(checked) => handleChange("encryption", checked)}
                        />
                      </Flex>
                      <Separator size="4" />
                      <Flex justify="between" align="center" mt="3">
                        <Box>
                          <Text size="2" weight="medium">
                            {t("proxy.dataCompression")}
                          </Text>
                          <Text size="1" color="gray">
                            {t("proxy.dataCompressionDesc")}
                          </Text>
                        </Box>
                        <Switch
                          size="2"
                          checked={formData.compression}
                          onCheckedChange={(checked) => handleChange("compression", checked)}
                        />
                      </Flex>
                    </Box>
                  </Flex>
                </Tabs.Content>
              </motion.div>
            </AnimatePresence>
          </Tabs.Root>

          <Separator size="4" my="4" />

          {/* Footer Actions */}
          <Flex justify="end" gap="3">
            <Dialog.Close>
              <Button variant="soft" color="gray" size="2">
                <Icon icon="lucide:x" width="16" height="16" />
                {t("common.cancel")}
              </Button>
            </Dialog.Close>
            <Button
              size="2"
              disabled={
                !formData.serverId ||
                !formData.name ||
                !formData.type ||
                !formData.localIp ||
                !formData.localPort ||
                !formData.remotePort ||
                !!errors.serverId ||
                !!errors.name ||
                !!errors.type ||
                !!errors.localIp ||
                !!errors.localPort ||
                !!errors.remotePort ||
                loading
              }
              onClick={handleSubmit}
              style={{
                background: "linear-gradient(135deg, var(--accent-9) 0%, var(--accent-10) 100%)",
                color: "white",
              }}
            >
              {loading ? (
                isEditing ? (
                  <Icon icon="lucide:pencil" width="16" height="16" color="white" />
                ) : (
                  <Icon icon="lucide:plus" width="16" height="16" color="white" />
                )
              ) : isEditing ? (
                <Icon icon="lucide:pencil" width="16" height="16" color="white" />
              ) : (
                <Icon icon="lucide:plus" width="16" height="16" color="white" />
              )}
              {loading
                ? isEditing
                  ? t("proxy.saving")
                  : t("proxy.adding")
                : isEditing
                  ? t("proxy.saveChanges")
                  : t("proxy.addProxy")}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <AlertDialog.Root open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>{t("common.discardChanges")}</AlertDialog.Title>
          <AlertDialog.Description size="2">
            {t("common.discardChangesDesc")}
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                {t("common.keepEditing")}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={confirmDiscard}>
                {t("common.discard")}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}
