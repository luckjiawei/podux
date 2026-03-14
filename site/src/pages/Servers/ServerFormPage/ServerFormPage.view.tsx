import { Icon } from "@iconify/react";
import {
  Button,
  Flex,
  Text,
  TextField,
  Box,
  Separator,
  Switch,
  TextArea,
  Select,
  Spinner,
  Table,
  IconButton,
} from "@radix-ui/themes";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { FormItem } from "../../../components/FormItem";
import { PageHeader } from "../../../components/PageHeader";
import { SectionHeading } from "../../../components/SectionHeading";
import { RadioCardGroup } from "../../../components/RadioCardGroup";
import { type ServerFormData } from "./useServerForm";

interface ServerFormPageViewProps {
  isEditing: boolean;
  formData: ServerFormData;
  errors: Record<string, string>;
  submitting: boolean;
  loadingServer: boolean;
  frpVersion: string;
  mounted: boolean;
  onChange: (field: keyof Omit<ServerFormData, "auth" | "log" | "transport" | "metadatas">, value: string | number | boolean) => void;
  onAuthChange: (field: keyof ServerFormData["auth"], value: string) => void;
  onLogChange: (field: keyof ServerFormData["log"], value: string | number) => void;
  onTransportChange: (field: keyof ServerFormData["transport"], value: string) => void;
  onTlsChange: (field: keyof ServerFormData["transport"]["tls"], value: boolean) => void;
  onTlsStringChange: (field: string, value: string) => void;
  onFileUpload: (field: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onSetFormData: (fn: (prev: ServerFormData) => ServerFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ServerFormPageView({
  isEditing,
  formData,
  errors,
  submitting,
  loadingServer,
  frpVersion,
  mounted,
  onChange,
  onAuthChange,
  onLogChange,
  onTransportChange,
  onTlsChange,
  onTlsStringChange,
  onFileUpload,
  onSetFormData,
  onSubmit,
  onCancel,
}: ServerFormPageViewProps) {
  const { t } = useTranslation();
  const [showToken, setShowToken] = useState(false);
  const [showOidcSecret, setShowOidcSecret] = useState(false);
  const [newMetaKey, setNewMetaKey] = useState("");
  const [newMetaValue, setNewMetaValue] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleAddMetadata = () => {
    if (!newMetaKey) return;
    onSetFormData((prev) => ({
      ...prev,
      metadatas: { ...prev.metadatas, [newMetaKey]: newMetaValue },
    }));
    setNewMetaKey("");
    setNewMetaValue("");
  };

  const handleRemoveMetadata = (key: string) => {
    onSetFormData((prev) => {
      const next = { ...prev.metadatas };
      delete next[key];
      return { ...prev, metadatas: next };
    });
  };

  if (loadingServer) {
    return (
      <Flex align="center" justify="center" className="min-h-[60vh]">
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-5 overflow-hidden">
      <PageHeader
        title={isEditing ? t("server.editServer") : t("server.addServer")}
        description={isEditing ? t("server.updateServerDesc") : t("server.addServerDesc")}
        visible={mounted}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="flex-1 min-h-0 flex overflow-hidden"
      >
        <div className="flex-1 min-h-0 flex gap-8">
          <div
            ref={scrollContainerRef}
            className="flex-1 min-w-0 min-h-0 overflow-y-auto pr-2"
          >
            <Flex direction="column" gap="8">

              {/* ── 基本信息 ── */}
              <section>
                <SectionHeading id="section-basic" title={t("proxy.sectionBasic")} icon="lucide:info" />
                <Flex direction="column" gap="4">
                  <FormItem label={t("server.serverName")} required error={errors.serverName}>
                    <TextField.Root
                      size="2"
                      placeholder={t("server.serverNamePlaceholder")}
                      value={formData.serverName}
                      onChange={(e) => onChange("serverName", e.target.value)}
                      color={errors.serverName ? "red" : undefined}
                    />
                  </FormItem>

                  <Flex gap="3">
                    <Box className="flex-[2]">
                      <FormItem label={t("server.hostAddressLabel")} required error={errors.serverAddr}>
                        <TextField.Root
                          size="2"
                          placeholder={t("server.hostAddressPlaceholder")}
                          value={formData.serverAddr}
                          onChange={(e) => onChange("serverAddr", e.target.value)}
                          color={errors.serverAddr ? "red" : undefined}
                        />
                      </FormItem>
                    </Box>
                    <Box className="flex-1">
                      <FormItem label={t("server.portLabel")} required error={errors.serverPort}>
                        <TextField.Root
                          size="2"
                          type="number"
                          placeholder={t("server.portPlaceholder")}
                          value={formData.serverPort || ""}
                          onChange={(e) => onChange("serverPort", parseInt(e.target.value) || 0)}
                          color={errors.serverPort ? "red" : undefined}
                        />
                      </FormItem>
                    </Box>
                  </Flex>

                  <FormItem label={t("server.version")} required>
                    <Select.Root
                      value={formData.serverVersion}
                      onValueChange={(v) => onChange("serverVersion", v)}
                    >
                      <Select.Trigger placeholder={t("server.selectVersion")} style={{ width: "100%" }} />
                      <Select.Content>
                        <Select.Item value="built-in">
                          {t("server.builtIn")} {frpVersion && `(${frpVersion})`}
                        </Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </FormItem>
                </Flex>
              </section>

              <Separator size="4" />

              {/* ── 认证 ── */}
              <section>
                <SectionHeading id="section-auth" title={t("server.authentication")} icon="lucide:lock" />
                <Flex direction="column" gap="4">
                  <FormItem label={t("server.authentication")} required>
                    <RadioCardGroup
                      options={[
                        { value: "none",  label: t("server.authMethodNone"),  icon: "lucide:ban" },
                        { value: "token", label: t("server.authMethodToken"), icon: "lucide:key" },
                        { value: "oidc",  label: t("server.authMethodOidc"),  icon: "lucide:shield-check", comingSoon: true },
                      ]}
                      value={formData.auth.method}
                      onChange={(v) => onAuthChange("method", v as ServerFormData["auth"]["method"])}
                      comingSoonLabel={t("common.comingSoon")}
                    />
                  </FormItem>

                  <FormItem label={t("server.user")}>
                    <TextField.Root
                      size="2"
                      placeholder={t("server.userPlaceholder")}
                      value={formData.user}
                      onChange={(e) => onChange("user", e.target.value)}
                    />
                  </FormItem>

                  <AnimatePresence>
                    {formData.auth.method === "token" && (
                      <FormItem key="token-field" label={t("server.token")} animate>
                        <TextField.Root
                          size="2"
                          type={showToken ? "text" : "password"}
                          placeholder={t("server.tokenPlaceholder")}
                          value={formData.auth.token}
                          onChange={(e) => onAuthChange("token", e.target.value)}
                        >
                          <TextField.Slot side="right">
                            <Icon
                              icon={showToken ? "lucide:eye-off" : "lucide:eye"}
                              className="cursor-pointer"
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
                          onChange={(e) => onAuthChange("oidcClientId", e.target.value)}
                        />
                      </FormItem>
                      <FormItem label={t("server.clientSecret")}>
                        <TextField.Root
                          size="2"
                          type={showOidcSecret ? "text" : "password"}
                          placeholder={t("server.clientSecretPlaceholder")}
                          value={formData.auth.oidcClientSecret}
                          onChange={(e) => onAuthChange("oidcClientSecret", e.target.value)}
                        >
                          <TextField.Slot side="right">
                            <Icon
                              icon={showOidcSecret ? "lucide:eye-off" : "lucide:eye"}
                              className="cursor-pointer"
                              onClick={() => setShowOidcSecret(!showOidcSecret)}
                            />
                          </TextField.Slot>
                        </TextField.Root>
                      </FormItem>
                      <FormItem label={t("server.audience")}>
                        <TextField.Root
                          size="2"
                          placeholder={t("server.audiencePlaceholder")}
                          value={formData.auth.oidcAudience}
                          onChange={(e) => onAuthChange("oidcAudience", e.target.value)}
                        />
                      </FormItem>
                      <FormItem label={t("server.tokenEndpoint")}>
                        <TextField.Root
                          size="2"
                          placeholder={t("server.tokenEndpointPlaceholder")}
                          value={formData.auth.oidcTokenEndpoint}
                          onChange={(e) => onAuthChange("oidcTokenEndpoint", e.target.value)}
                        />
                      </FormItem>
                    </Flex>
                  )}
                </Flex>
              </section>

              <Separator size="4" />

              {/* ── 日志 ── */}
              <section>
                <SectionHeading id="section-log" title={t("server.log")} icon="lucide:scroll-text" />
                <Flex direction="column" gap="4">
                  <FormItem label={t("server.logLevel")}>
                    <Select.Root
                      value={formData.log.level}
                      onValueChange={(v) => onLogChange("level", v)}
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

                  <FormItem label={t("server.maxDays")}>
                    <TextField.Root
                      size="2"
                      type="number"
                      placeholder={t("server.maxDaysPlaceholder")}
                      value={formData.log.maxDays}
                      onChange={(e) => onLogChange("maxDays", parseInt(e.target.value) || 0)}
                    />
                  </FormItem>
                </Flex>
              </section>

              <Separator size="4" />

              {/* ── 传输 ── */}
              <section>
                <SectionHeading id="section-transport" title={t("server.transport")} icon="lucide:network" />
                <Flex direction="column" gap="4">
                  <FormItem label={t("server.protocol")}>
                    <Select.Root
                      value={formData.transport.protocol}
                      onValueChange={(v) => onTransportChange("protocol", v)}
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
                    <Box>
                      <Text size="2" weight="medium">{t("server.tlsEnable")}</Text>
                    </Box>
                    <Switch
                      size="2"
                      checked={formData.transport.tls.enable}
                      onCheckedChange={(v) => onTlsChange("enable", v)}
                    />
                  </Flex>

                  <Flex justify="between" align="center">
                    <Box>
                      <Text size="2" weight="medium">{t("server.disableCustomTLSFirstByte")}</Text>
                    </Box>
                    <Switch
                      size="2"
                      checked={formData.transport.tls.disableCustomTLSFirstByte}
                      onCheckedChange={(v) => onTlsChange("disableCustomTLSFirstByte", v)}
                    />
                  </Flex>

                  <AnimatePresence>
                    {formData.transport.tls.enable && (
                      <motion.div
                        key="tls-fields"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <Flex direction="column" gap="4" className="rounded-[var(--radius-3)] bg-[var(--gray-3)] p-3">
                          <FormItem label={t("server.serverNameSNI")}>
                            <TextField.Root
                              size="2"
                              placeholder={t("server.serverNameSNIPlaceholder")}
                              value={formData.transport.tls.serverName}
                              onChange={(e) => onTlsStringChange("serverName", e.target.value)}
                            />
                          </FormItem>

                          {(["certFile", "keyFile", "trustedCaFile"] as const).map((field) => {
                            const labelKey = field === "certFile" ? "server.certFileContent" : field === "keyFile" ? "server.keyFileContent" : "server.trustedCAContent";
                            const placeholderKey = field === "certFile" ? "server.certFilePlaceholder" : field === "keyFile" ? "server.keyFilePlaceholder" : "server.trustedCAPlaceholder";
                            const inputId = `file-upload-${field}`;
                            return (
                              <FormItem key={field} label={t(labelKey)}>
                                <Flex direction="column" gap="2">
                                  <TextArea
                                    size="2"
                                    placeholder={t(placeholderKey)}
                                    value={formData.transport.tls[field]}
                                    onChange={(e) => onTlsStringChange(field, e.target.value)}
                                    className="min-h-[80px] font-mono text-[12px]"
                                  />
                                  <Flex justify="end">
                                    <input
                                      type="file"
                                      id={inputId}
                                      className="hidden"
                                      onChange={(e) => onFileUpload(field, e)}
                                    />
                                    <Button
                                      size="1"
                                      variant="soft"
                                      onClick={() => document.getElementById(inputId)?.click()}
                                    >
                                      <Icon icon="lucide:upload" width="14" height="14" />
                                      {t("server.loadFromFile")}
                                    </Button>
                                  </Flex>
                                </Flex>
                              </FormItem>
                            );
                          })}
                        </Flex>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <FormItem label={t("server.proxyUrl")}>
                    <TextField.Root
                      size="2"
                      placeholder={t("server.proxyUrlPlaceholder")}
                      value={formData.transport.proxyURL}
                      onChange={(e) => onTransportChange("proxyURL", e.target.value)}
                    />
                  </FormItem>
                </Flex>
              </section>

              <Separator size="4" />

              {/* ── 描述 & 其他 ── */}
              <section>
                <SectionHeading id="section-misc" title={t("proxy.descriptionLabel")} icon="lucide:file-text" />
                <Flex direction="column" gap="4">
                  <FormItem label={t("server.descriptionLabel")}>
                    <TextArea
                      size="2"
                      placeholder={t("server.descriptionPlaceholder")}
                      value={formData.description}
                      onChange={(e) => onChange("description", e.target.value)}
                      className="min-h-[80px]"
                    />
                  </FormItem>

                  <Flex justify="between" align="center">
                    <Box>
                      <Text size="2" weight="medium">{t("server.autoConnection")}</Text>
                      <Text as="p" size="1" color="gray">{t("server.autoConnectionDesc")}</Text>
                    </Box>
                    <Switch
                      size="2"
                      checked={formData.autoConnection}
                      onCheckedChange={(v) => onChange("autoConnection", v)}
                    />
                  </Flex>
                </Flex>
              </section>

              <Separator size="4" />

              {/* ── Metadatas ── */}
              <section>
                <SectionHeading id="section-metadatas" title={t("server.metadatas")} icon="lucide:tag" />
                <Flex direction="column" gap="4">
                  <Table.Root variant="surface">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>{t("server.metadataKey")}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t("server.metadataValue")}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell width="40px" />
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {Object.entries(formData.metadatas).map(([key, value]) => (
                        <Table.Row key={key}>
                          <Table.Cell>{key}</Table.Cell>
                          <Table.Cell>{value}</Table.Cell>
                          <Table.Cell>
                            <IconButton variant="ghost" color="red" onClick={() => handleRemoveMetadata(key)}>
                              <Icon icon="lucide:trash" />
                            </IconButton>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                      {Object.keys(formData.metadatas).length === 0 && (
                        <Table.Row>
                          <Table.Cell colSpan={3} align="center">
                            <Text color="gray" size="2">{t("server.noMetadata")}</Text>
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Root>

                  <Flex gap="2">
                    <TextField.Root
                      className="flex-1"
                      placeholder={t("server.metadataKeyPlaceholder")}
                      value={newMetaKey}
                      onChange={(e) => setNewMetaKey(e.target.value)}
                    />
                    <TextField.Root
                      className="flex-1"
                      placeholder={t("server.metadataValuePlaceholder")}
                      value={newMetaValue}
                      onChange={(e) => setNewMetaValue(e.target.value)}
                    />
                    <Button variant="soft" onClick={handleAddMetadata} disabled={!newMetaKey}>
                      <Icon icon="lucide:plus" />
                      {t("common.add")}
                    </Button>
                  </Flex>
                </Flex>
              </section>

              {/* Actions */}
              <Flex justify="end" gap="3" pb="6">
                <Button variant="soft" color="gray" size="2" onClick={onCancel}>
                  <Icon icon="lucide:arrow-left" width="16" height="16" />
                  {t("common.cancel")}
                </Button>
                <Button
                  size="2"
                  disabled={submitting}
                  onClick={onSubmit}
                  className="[background:linear-gradient(135deg,var(--accent-9)_0%,var(--accent-10)_100%)] text-white"
                >
                  {submitting ? (
                    <Spinner size="1" />
                  ) : isEditing ? (
                    <Icon icon="lucide:pencil" width="16" height="16" />
                  ) : (
                    <Icon icon="lucide:plus" width="16" height="16" />
                  )}
                  {submitting
                    ? isEditing ? t("server.saving") : t("server.adding")
                    : isEditing ? t("server.saveChanges") : t("server.addServer")}
                </Button>
              </Flex>
            </Flex>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
