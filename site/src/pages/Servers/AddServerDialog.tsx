import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  Box,
  Separator,
  IconButton,
  TextArea,
  AlertDialog,
  Select,
  Tabs,
  Switch,
  Table,
} from "@radix-ui/themes";
import { REGEX } from "../../lib/regex";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

import { FormItem } from "../../components/FormItem";

export interface ServerFormData {
  serverName: string;
  serverAddr: string;
  serverPort: number;
  serverVersion: string;
  description: string;
  autoConnection: boolean;
  auth: {
    method: "none" | "token" | "oidc";
    token: string;
    oidcClientId: string;
    oidcClientSecret: string;
    oidcAudience: string;
    oidcTokenEndpoint: string;
  };
  log: {
    level: "trace" | "debug" | "info" | "warn" | "error";
    maxDays: number;
    // to: string;
  };
  transport: {
    protocol: "tcp" | "kcp" | "quic" | "websocket" | "wss";
    tls: {
      enable: boolean;
      disableCustomTLSFirstByte: boolean;
      certFile: string;
      keyFile: string;
      trustedCaFile: string;
      serverName: string;
    };
    proxyURL: string;
  };
  metadatas: Record<string, string>;
}

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ServerFormData) => Promise<void>;
  initialData?: Partial<ServerFormData>;
}

export function AddServerDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: AddServerDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("");
  const [showToken, setShowToken] = useState(false);
  const [showOidcClientSecret, setShowOidcClientSecret] = useState(false);

  useEffect(() => {
    fetch("/api/frp/version")
      .then((res) => res.json())
      .then((data) => {
        if (data.frp) {
          setAppVersion(data.frp);
        }
      })
      .catch(console.error);
  }, []);

  const defaultData: ServerFormData = {
    serverName: "",
    serverAddr: "",
    serverPort: 7000,
    serverVersion: "built-in",
    description: "",
    autoConnection: false,
    auth: {
      method: "none",
      token: "",
      oidcClientId: "",
      oidcClientSecret: "",
      oidcAudience: "",
      oidcTokenEndpoint: "",
    },
    log: {
      level: "info",
      maxDays: 3,
      // to: "./frpc.log",
    },
    transport: {
      protocol: "tcp",
      tls: {
        enable: true,
        disableCustomTLSFirstByte: false,
        certFile: "",
        keyFile: "",
        trustedCaFile: "",
        serverName: "",
      },
      proxyURL: "",
    },
    metadatas: {},
  };

  const [formData, setFormData] = useState<ServerFormData>(defaultData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateServerAddr = (value: string) => {
    if (!value) return "";
    if (!REGEX.IP_OR_HOSTNAME.test(value)) {
      return t("server.errorInvalidIP");
    }
    return "";
  };

  const validateServerPort = (value: number) => {
    if (!value || !REGEX.PORT.test(value.toString())) {
      return t("server.errorInvalidPort");
    }
    return "";
  };

  const validateServerName = (value: string) => {
    if (!value) return "";
    if (!REGEX.SERVER_NAME.test(value)) {
      return t("server.errorInvalidServerName");
    }
    return "";
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          ...defaultData,
          ...initialData,
          auth: {
            ...defaultData.auth,
            ...(initialData.auth || {}),
          },
          log: {
            ...defaultData.log,
            ...(initialData.log || {}),
          },
          transport: {
            ...defaultData.transport,
            ...(initialData.transport || {}),
            tls: {
              ...defaultData.transport.tls,
              ...(initialData.transport?.tls || {}),
            },
          },
          metadatas: initialData.metadatas || {},
        });
        if (initialData.serverName) {
          const error = validateServerName(initialData.serverName);
          setErrors((prev) => ({ ...prev, serverName: error }));
        }
        if (initialData.serverAddr) {
          const error = validateServerAddr(initialData.serverAddr);
          setErrors((prev) => ({ ...prev, serverAddr: error }));
        }
        if (initialData.serverPort) {
          const error = validateServerPort(initialData.serverPort);
          setErrors((prev) => ({ ...prev, serverPort: error }));
        }
      } else {
        setFormData(defaultData);
        setErrors({});
      }
      setLoading(false);
    }
  }, [open, initialData]);

  const handleChange = (
    field: keyof Omit<ServerFormData, "auth">,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "serverAddr") {
      const error = validateServerAddr(value as string);
      setErrors((prev) => ({ ...prev, serverAddr: error }));
    }

    if (field === "serverPort") {
      const error = validateServerPort(value as number);
      setErrors((prev) => ({ ...prev, serverPort: error }));
    }

    if (field === "serverName") {
      const error = validateServerName(value as string);
      setErrors((prev) => ({ ...prev, serverName: error }));
    }
  };

  const handleAuthChange = (field: keyof ServerFormData["auth"], value: string) => {
    setFormData((prev) => ({
      ...prev,
      auth: {
        ...prev.auth,
        [field]: value,
      },
    }));
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Check if dirty
      const currentInitial = initialData
        ? {
            ...defaultData,
            ...initialData,
            auth: {
              ...defaultData.auth,
              ...(initialData.auth || {}),
            },
            log: {
              ...defaultData.log,
              ...(initialData.log || {}),
            },
            transport: {
              ...defaultData.transport,
              ...(initialData.transport || {}),
              tls: {
                ...defaultData.transport.tls,
                ...(initialData.transport?.tls || {}),
              },
            },
            metadatas: initialData.metadatas || {},
          }
        : defaultData;

      const isDirty = JSON.stringify(formData) !== JSON.stringify(currentInitial);
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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit server form:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogChange = (field: keyof ServerFormData["log"], value: any) => {
    setFormData((prev) => ({
      ...prev,
      log: {
        ...prev.log,
        [field]: value,
      },
    }));
  };

  const handleTransportChange = (field: keyof ServerFormData["transport"], value: any) => {
    setFormData((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        [field]: value,
      },
    }));
  };

  const handleTlsChange = (field: keyof ServerFormData["transport"]["tls"], value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        tls: {
          ...prev.transport.tls,
          [field]: value,
        },
      },
    }));
  };

  const handleTlsStringChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        tls: {
          ...prev.transport.tls,
          [field]: value,
        },
      },
    }));
  };

  const handleFileUpload = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (typeof content === "string") {
        handleTlsStringChange(field, content);
      }
    };
    reader.readAsText(file);
    // Reset input value to allow selecting same file again
    e.target.value = "";
  };

  // Metadata state
  const [newMetaKey, setNewMetaKey] = useState("");
  const [newMetaValue, setNewMetaValue] = useState("");

  const handleAddMetadata = () => {
    if (!newMetaKey) return;
    setFormData((prev) => ({
      ...prev,
      metadatas: {
        ...prev.metadatas,
        [newMetaKey]: newMetaValue,
      },
    }));
    setNewMetaKey("");
    setNewMetaValue("");
  };

  const handleRemoveMetadata = (key: string) => {
    setFormData((prev) => {
      const newMetadatas = { ...prev.metadatas };
      delete newMetadatas[key];
      return { ...prev, metadatas: newMetadatas };
    });
  };

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
                  padding: "14px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon icon="lucide:server" width="20" height="20" color="white" />
              </Box>
              <Box>
                <Dialog.Title size="5" weight="bold" mb="0">
                  {isEditing ? t("server.editServer") : t("server.addServer")}
                </Dialog.Title>
                <Text size="1" color="gray">
                  {isEditing ? t("server.updateServerDesc") : t("server.addServerDesc")}
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

          <Tabs.Root defaultValue="general">
            <Tabs.List>
              <Tabs.Trigger value="general">{t("server.general")}</Tabs.Trigger>
              <Tabs.Trigger value="log">{t("server.log")}</Tabs.Trigger>
              <Tabs.Trigger value="transport">{t("server.transport")}</Tabs.Trigger>
              <Tabs.Trigger value="metadatas">{t("server.metadatas")}</Tabs.Trigger>
            </Tabs.List>

            <Box pt="4">
              <Tabs.Content value="general">
                <Flex direction="column" gap="4">
                  <FormItem label={t("server.serverName")} error={errors.serverName} required>
                    <TextField.Root
                      size="2"
                      placeholder={t("server.serverNamePlaceholder")}
                      value={formData.serverName}
                      onChange={(e) => handleChange("serverName", e.target.value)}
                      color={errors.serverName ? "red" : undefined}
                    />
                  </FormItem>

                  {/* Host & Port */}
                  <Flex gap="3">
                    <Box style={{ flex: 2 }}>
                      <FormItem
                        label={t("server.hostAddressLabel")}
                        error={errors.serverAddr}
                        required
                      >
                        <TextField.Root
                          size="2"
                          placeholder={t("server.hostAddressPlaceholder")}
                          value={formData.serverAddr}
                          onChange={(e) => handleChange("serverAddr", e.target.value)}
                          color={errors.serverAddr ? "red" : undefined}
                        />
                      </FormItem>
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <FormItem label={t("server.portLabel")} error={errors.serverPort} required>
                        <TextField.Root
                          size="2"
                          type="number"
                          placeholder={t("server.portPlaceholder")}
                          value={formData.serverPort || ""}
                          onChange={(e) =>
                            handleChange("serverPort", parseInt(e.target.value) || 0)
                          }
                          color={errors.serverPort ? "red" : undefined}
                        />
                      </FormItem>
                    </Box>
                  </Flex>

                  {/* Version */}
                  <FormItem label={t("server.version")} required>
                    <Select.Root
                      value={formData.serverVersion}
                      onValueChange={(value) => handleChange("serverVersion", value)}
                    >
                      <Select.Trigger
                        placeholder={t("server.selectVersion")}
                        style={{ width: "100%" }}
                      />
                      <Select.Content>
                        <Select.Item value="built-in">
                          {t("server.builtIn")} {appVersion && `(${appVersion})`}
                        </Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </FormItem>

                  {/* Authentication */}
                  <Flex direction="column" gap="3">
                    <FormItem label={t("server.authentication")} required>
                      <Select.Root
                        value={formData.auth.method}
                        onValueChange={(value) =>
                          handleAuthChange("method", value as "none" | "token" | "oidc")
                        }
                      >
                        <Select.Trigger
                          placeholder={t("server.selectAuthMethod")}
                          style={{ width: "100%" }}
                        />
                        <Select.Content>
                          <Select.Item value="none">{t("server.authMethodNone")}</Select.Item>
                          <Select.Item value="token">{t("server.authMethodToken")}</Select.Item>
                          <Select.Item value="oidc" disabled>
                            {t("server.authMethodOidc")}
                          </Select.Item>
                        </Select.Content>
                      </Select.Root>
                    </FormItem>

                    <AnimatePresence>
                      {formData.auth.method === "token" && (
                        <FormItem key="token-field" label={t("server.token")} animate>
                          <TextField.Root
                            size="2"
                            type={showToken ? "text" : "password"}
                            placeholder={t("server.tokenPlaceholder")}
                            value={formData.auth.token}
                            onChange={(e) => handleAuthChange("token", e.target.value)}
                          >
                            <TextField.Slot side="right">
                              <Icon
                                icon={showToken ? "lucide:eye-off" : "lucide:eye"}
                                style={{ cursor: "pointer" }}
                                onClick={() => setShowToken(!showToken)}
                              />
                            </TextField.Slot>
                          </TextField.Root>
                        </FormItem>
                      )}
                    </AnimatePresence>

                    {formData.auth.method === "oidc" && (
                      <Flex direction="column" gap="3">
                        <FormItem label={t("server.clientId")}>
                          <TextField.Root
                            size="2"
                            placeholder={t("server.clientIdPlaceholder")}
                            value={formData.auth.oidcClientId}
                            onChange={(e) => handleAuthChange("oidcClientId", e.target.value)}
                          />
                        </FormItem>
                        <FormItem label={t("server.clientSecret")}>
                          <TextField.Root
                            size="2"
                            type={showOidcClientSecret ? "text" : "password"}
                            placeholder={t("server.clientSecretPlaceholder")}
                            value={formData.auth.oidcClientSecret}
                            onChange={(e) => handleAuthChange("oidcClientSecret", e.target.value)}
                          >
                            <TextField.Slot side="right">
                              <Icon
                                icon={showOidcClientSecret ? "lucide:eye-off" : "lucide:eye"}
                                style={{ cursor: "pointer" }}
                                onClick={() => setShowOidcClientSecret(!showOidcClientSecret)}
                              />
                            </TextField.Slot>
                          </TextField.Root>
                        </FormItem>
                        <FormItem label={t("server.audience")}>
                          <TextField.Root
                            size="2"
                            placeholder={t("server.audiencePlaceholder")}
                            value={formData.auth.oidcAudience}
                            onChange={(e) => handleAuthChange("oidcAudience", e.target.value)}
                          />
                        </FormItem>
                        <FormItem label={t("server.tokenEndpoint")}>
                          <TextField.Root
                            size="2"
                            placeholder={t("server.tokenEndpointPlaceholder")}
                            value={formData.auth.oidcTokenEndpoint}
                            onChange={(e) => handleAuthChange("oidcTokenEndpoint", e.target.value)}
                          />
                        </FormItem>
                      </Flex>
                    )}
                  </Flex>

                  {/* Description */}
                  <FormItem label={t("server.descriptionLabel")}>
                    <TextArea
                      size="2"
                      placeholder={t("server.descriptionPlaceholder")}
                      value={formData.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      style={{ minHeight: "80px" }}
                    />
                  </FormItem>

                  {/* Auto Connection */}
                  <Flex justify="between" align="center">
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="medium">
                        {t("server.autoConnection")}
                      </Text>
                      <Text size="1" color="gray">
                        {t("server.autoConnectionDesc")}
                      </Text>
                    </Flex>
                    <Switch
                      checked={formData.autoConnection}
                      onCheckedChange={(checked) => handleChange("autoConnection", checked)}
                    />
                  </Flex>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="log">
                <Flex direction="column" gap="4">
                  <FormItem label={t("server.logLevel")}>
                    <Select.Root
                      value={formData.log.level}
                      onValueChange={(value) => handleLogChange("level", value)}
                    >
                      <Select.Trigger style={{ width: "100%" }} />
                      <Select.Content>
                        <Select.Item value="trace">{t("server.logLevelTrace")}</Select.Item>
                        <Select.Item value="debug">{t("server.logLevelDebug")}</Select.Item>
                        <Select.Item value="info">{t("server.logLevelInfo")}</Select.Item>
                        <Select.Item value="warn">{t("server.logLevelWarn")}</Select.Item>
                        <Select.Item value="error">{t("server.logLevelError")}</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </FormItem>

                  {/* <FormItem label="Log File Path">
                    <TextField.Root
                      size="2"
                      placeholder="./frpc.log"
                      value={formData.log.to}
                      onChange={(e) => handleLogChange("to", e.target.value)}
                    />
                  </FormItem> */}

                  <FormItem label={t("server.maxDays")}>
                    <TextField.Root
                      size="2"
                      type="number"
                      placeholder={t("server.maxDaysPlaceholder")}
                      value={formData.log.maxDays}
                      onChange={(e) => handleLogChange("maxDays", parseInt(e.target.value) || 0)}
                    />
                  </FormItem>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="transport">
                <Flex direction="column" gap="4">
                  <FormItem label={t("server.protocol")}>
                    <Select.Root
                      value={formData.transport.protocol}
                      onValueChange={(value) => handleTransportChange("protocol", value)}
                    >
                      <Select.Trigger style={{ width: "100%" }} />
                      <Select.Content>
                        <Select.Item value="tcp">{t("server.protocolTcp")}</Select.Item>
                        <Select.Item value="kcp">{t("server.protocolKcp")}</Select.Item>
                        <Select.Item value="quic">{t("server.protocolQuic")}</Select.Item>
                        <Select.Item value="websocket">{t("server.protocolWebsocket")}</Select.Item>
                        <Select.Item value="wss">{t("server.protocolWss")}</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </FormItem>

                  <Flex justify="between" align="center">
                    <Text size="2">{t("server.tlsEnable")}</Text>
                    <Switch
                      checked={formData.transport.tls.enable}
                      onCheckedChange={(checked) => handleTlsChange("enable", checked)}
                    />
                  </Flex>

                  <Flex justify="between" align="center">
                    <Text size="2">{t("server.disableCustomTLSFirstByte")}</Text>
                    <Switch
                      checked={formData.transport.tls.disableCustomTLSFirstByte}
                      onCheckedChange={(checked) =>
                        handleTlsChange("disableCustomTLSFirstByte", checked)
                      }
                    />
                  </Flex>

                  {formData.transport.tls.enable && (
                    <Flex
                      direction="column"
                      gap="4"
                      p="3"
                      style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-3)" }}
                    >
                      <FormItem label={t("server.serverNameSNI")}>
                        <TextField.Root
                          size="2"
                          placeholder={t("server.serverNameSNIPlaceholder")}
                          value={formData.transport.tls.serverName}
                          onChange={(e) => handleTlsStringChange("serverName", e.target.value)}
                        />
                      </FormItem>

                      <FormItem label={t("server.certFileContent")}>
                        <Flex direction="column" gap="2">
                          <TextArea
                            size="2"
                            placeholder={t("server.certFilePlaceholder")}
                            value={formData.transport.tls.certFile}
                            onChange={(e) => handleTlsStringChange("certFile", e.target.value)}
                            style={{ minHeight: "80px", fontFamily: "monospace", fontSize: "12px" }}
                          />
                          <Flex justify="end">
                            <input
                              type="file"
                              id="file-upload-cert"
                              style={{ display: "none" }}
                              onChange={(e) => handleFileUpload("certFile", e)}
                            />
                            <Button
                              size="1"
                              variant="soft"
                              onClick={() => document.getElementById("file-upload-cert")?.click()}
                            >
                              <Icon icon="lucide:upload" width="14" height="14" />
                              {t("server.loadFromFile")}
                            </Button>
                          </Flex>
                        </Flex>
                      </FormItem>

                      <FormItem label={t("server.keyFileContent")}>
                        <Flex direction="column" gap="2">
                          <TextArea
                            size="2"
                            placeholder={t("server.keyFilePlaceholder")}
                            value={formData.transport.tls.keyFile}
                            onChange={(e) => handleTlsStringChange("keyFile", e.target.value)}
                            style={{ minHeight: "80px", fontFamily: "monospace", fontSize: "12px" }}
                          />
                          <Flex justify="end">
                            <input
                              type="file"
                              id="file-upload-key"
                              style={{ display: "none" }}
                              onChange={(e) => handleFileUpload("keyFile", e)}
                            />
                            <Button
                              size="1"
                              variant="soft"
                              onClick={() => document.getElementById("file-upload-key")?.click()}
                            >
                              <Icon icon="lucide:upload" width="14" height="14" />
                              {t("server.loadFromFile")}
                            </Button>
                          </Flex>
                        </Flex>
                      </FormItem>

                      <FormItem label={t("server.trustedCAContent")}>
                        <Flex direction="column" gap="2">
                          <TextArea
                            size="2"
                            placeholder={t("server.trustedCAPlaceholder")}
                            value={formData.transport.tls.trustedCaFile}
                            onChange={(e) => handleTlsStringChange("trustedCaFile", e.target.value)}
                            style={{ minHeight: "80px", fontFamily: "monospace", fontSize: "12px" }}
                          />
                          <Flex justify="end">
                            <input
                              type="file"
                              id="file-upload-ca"
                              style={{ display: "none" }}
                              onChange={(e) => handleFileUpload("trustedCaFile", e)}
                            />
                            <Button
                              size="1"
                              variant="soft"
                              onClick={() => document.getElementById("file-upload-ca")?.click()}
                            >
                              <Icon icon="lucide:upload" width="14" height="14" />
                              {t("server.loadFromFile")}
                            </Button>
                          </Flex>
                        </Flex>
                      </FormItem>
                    </Flex>
                  )}

                  <FormItem label={t("server.proxyUrl")}>
                    <TextField.Root
                      size="2"
                      placeholder={t("server.proxyUrlPlaceholder")}
                      value={formData.transport.proxyURL}
                      onChange={(e) => handleTransportChange("proxyURL", e.target.value)}
                    />
                  </FormItem>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="metadatas">
                <Flex direction="column" gap="4">
                  <Table.Root variant="surface">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>{t("server.metadataKey")}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t("server.metadataValue")}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell width="40px"></Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {Object.entries(formData.metadatas).map(([key, value]) => (
                        <Table.Row key={key}>
                          <Table.Cell>{key}</Table.Cell>
                          <Table.Cell>{value}</Table.Cell>
                          <Table.Cell>
                            <IconButton
                              variant="ghost"
                              color="red"
                              onClick={() => handleRemoveMetadata(key)}
                            >
                              <Icon icon="lucide:trash" />
                            </IconButton>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                      {Object.keys(formData.metadatas).length === 0 && (
                        <Table.Row>
                          <Table.Cell colSpan={3} align="center">
                            <Text color="gray" size="2">
                              {t("server.noMetadata")}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Root>

                  <Flex gap="2">
                    <TextField.Root
                      placeholder={t("server.metadataKeyPlaceholder")}
                      value={newMetaKey}
                      onChange={(e) => setNewMetaKey(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <TextField.Root
                      placeholder={t("server.metadataValuePlaceholder")}
                      value={newMetaValue}
                      onChange={(e) => setNewMetaValue(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Button variant="soft" onClick={handleAddMetadata} disabled={!newMetaKey}>
                      <Icon icon="lucide:plus" />
                      {t("common.add")}
                    </Button>
                  </Flex>
                </Flex>
              </Tabs.Content>
            </Box>
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
                !formData.serverName ||
                !formData.serverAddr ||
                !formData.serverPort ||
                !!errors.serverName ||
                !!errors.serverAddr ||
                !!errors.serverPort ||
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
                  ? t("server.saving")
                  : t("server.adding")
                : isEditing
                  ? t("server.saveChanges")
                  : t("server.addServer")}
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
