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
  Callout,
  Spinner,
} from "@radix-ui/themes";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useRef } from "react";

import { FormItem } from "../../../components/FormItem";
import { PageHeader } from "../../../components/PageHeader";
import { SectionHeading } from "../../../components/SectionHeading";
import { RadioCardGroup } from "../../../components/RadioCardGroup";
import { ServerLatency } from "../../../components/ServerLatency";
import { type ProxyFormData, type ServerOption } from "./useProxyForm";

const proxyTypes = [
  { value: "tcp", label: "TCP", icon: "lucide:arrow-right-left", comingSoon: false },
  { value: "udp", label: "UDP", icon: "lucide:radio", comingSoon: false },
  { value: "http", label: "HTTP", icon: "lucide:globe", comingSoon: false },
  { value: "https", label: "HTTPS", icon: "lucide:lock", comingSoon: false },
  { value: "tcpmux", label: "TCPMUX", icon: "lucide:split", comingSoon: true },
  { value: "stcp", label: "STCP", icon: "lucide:shield", comingSoon: true },
  { value: "sudp", label: "SUDP", icon: "lucide:shield-ellipsis", comingSoon: true },
  { value: "xtcp", label: "XTCP", icon: "lucide:share-2", comingSoon: false },
];

const BASE_PLUGIN_TYPES = [
  { value: "socks5", label: "SOCKS5", icon: "lucide:globe", comingSoon: false, tcpOnly: true },
  {
    value: "http_proxy",
    label: "HTTPProxy",
    icon: "lucide:waypoints",
    comingSoon: true,
    tcpOnly: false,
  },
  {
    value: "static_file",
    label: "StaticFile",
    icon: "lucide:folder-open",
    comingSoon: true,
    tcpOnly: false,
  },
  {
    value: "unix_domain_socket",
    label: "UnixDomainSocket",
    icon: "lucide:cable",
    comingSoon: true,
    tcpOnly: false,
  },
  {
    value: "http2https",
    label: "HTTP2HTTPS",
    icon: "lucide:lock",
    comingSoon: true,
    tcpOnly: false,
  },
  {
    value: "https2http",
    label: "HTTPS2HTTP",
    icon: "lucide:lock-open",
    comingSoon: true,
    tcpOnly: false,
  },
  {
    value: "https2https",
    label: "HTTPS2HTTPS",
    icon: "lucide:shield-check",
    comingSoon: true,
    tcpOnly: false,
  },
  { value: "tls2raw", label: "TLS2Raw", icon: "lucide:zap", comingSoon: true, tcpOnly: false },
  {
    value: "virtual_net",
    label: "VirtualNet",
    icon: "lucide:network",
    comingSoon: true,
    tcpOnly: false,
  },
];

interface ProxyFormPageViewProps {
  isEditing: boolean;
  formData: ProxyFormData;
  servers: ServerOption[];
  loadingServers: boolean;
  loadingProxy: boolean;
  submitting: boolean;
  errors: Partial<Record<keyof ProxyFormData, string>>;
  isHttpType: boolean;
  isXtcpType: boolean;
  isSocks5Plugin: boolean;
  mounted: boolean;
  onChange: (field: keyof ProxyFormData, value: string | boolean | string[]) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onNavigateToServers: () => void;
}

export function ProxyFormPageView({
  isEditing,
  formData,
  servers,
  loadingServers,
  loadingProxy,
  submitting,
  errors,
  isHttpType,
  isXtcpType,
  isSocks5Plugin,
  mounted,
  onChange,
  onSubmit,
  onCancel,
  onNavigateToServers,
}: ProxyFormPageViewProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (loadingProxy) {
    return (
      <Flex align="center" justify="center" className="min-h-[60vh]">
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
      <PageHeader
        title={isEditing ? t("proxy.editProxy") : t("proxy.addProxy")}
        description={isEditing ? t("proxy.updateProxyDesc") : t("proxy.addProxyDesc")}
        visible={mounted}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="flex min-h-0 flex-1 overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 gap-8">
          {/* form */}
          <div ref={scrollContainerRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-2">
            <Flex direction="column" gap="8">
              <section>
                <SectionHeading
                  id="section-basic"
                  title={t("proxy.sectionBasic")}
                  icon="lucide:info"
                />
                <Flex direction="column" gap="4">
                  <FormItem label={t("proxy.selectServer")} required>
                    <Select.Root
                      value={formData.serverId}
                      onValueChange={(v) => onChange("serverId", v)}
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
                        {servers.map((s) => (
                          <Select.Item key={s.id} value={s.id}>
                            <Flex align="center" gap="2">
                              <span
                                className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                                  s.bootStatus === "running"
                                    ? "bg-[var(--green-9)]"
                                    : "bg-[var(--gray-7)]"
                                }`}
                              />
                              <Text size="2">{s.serverName}</Text>
                              <ServerLatency networkStatus={s.networkStatus} size="1" />
                            </Flex>
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
                              className="shrink-0 cursor-pointer"
                              onClick={onNavigateToServers}
                            >
                              {t("proxy.goAddServer")}
                              <Icon icon="lucide:arrow-right" width="12" height="12" />
                            </Button>
                          </Flex>
                        </Callout.Text>
                      </Callout.Root>
                    )}
                  </FormItem>

                  <FormItem label={t("proxy.proxyName")} required error={errors.name}>
                    <TextField.Root
                      size="2"
                      placeholder={t("proxy.proxyNamePlaceholder")}
                      value={formData.name}
                      onChange={(e) => onChange("name", e.target.value)}
                      color={errors.name ? "red" : undefined}
                    />
                  </FormItem>

                  <FormItem label={t("proxy.proxyType")} required>
                    <RadioCardGroup
                      options={proxyTypes}
                      value={formData.type}
                      onChange={(v) => onChange("type", v as ProxyFormData["type"])}
                      comingSoonLabel={t("common.comingSoon")}
                    />
                  </FormItem>
                </Flex>
              </section>

              <Separator size="4" />

              {/* 网络配置 */}
              <section>
                <SectionHeading
                  id="section-network"
                  title={t("proxy.sectionNetwork")}
                  icon="lucide:network"
                />
                <Flex direction="column" gap="4">
                  <AnimatePresence>
                    {!isSocks5Plugin && (
                      <motion.div
                        key="local-addr"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <Flex gap="3">
                          <Box className="flex-[2]">
                            <FormItem
                              label={t("proxy.localAddress")}
                              required
                              error={errors.localIp}
                            >
                              <TextField.Root
                                size="2"
                                placeholder={t("proxy.localAddressPlaceholder")}
                                value={formData.localIp}
                                onChange={(e) => onChange("localIp", e.target.value)}
                                color={errors.localIp ? "red" : undefined}
                              />
                            </FormItem>
                          </Box>
                          <Box className="flex-1">
                            <FormItem
                              label={t("proxy.localPort")}
                              required
                              error={errors.localPort}
                            >
                              <TextField.Root
                                size="2"
                                placeholder={t("proxy.localPortPlaceholder")}
                                type="number"
                                value={formData.localPort}
                                onChange={(e) => onChange("localPort", e.target.value)}
                                color={errors.localPort ? "red" : undefined}
                              />
                            </FormItem>
                          </Box>
                        </Flex>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isHttpType ? (
                    <>
                      <FormItem label={t("proxy.customDomainsLabel")}>
                        <Flex direction="column" gap="2">
                          {formData.customDomains.map((domain, index) => (
                            <Flex key={index} gap="2" align="center">
                              <TextField.Root
                                size="2"
                                style={{ flex: 1 }}
                                placeholder={`example.com`}
                                value={domain}
                                onChange={(e) => {
                                  const next = [...formData.customDomains];
                                  next[index] = e.target.value;
                                  onChange("customDomains", next);
                                }}
                              />
                              <Button
                                type="button"
                                size="2"
                                variant="soft"
                                color="red"
                                onClick={() => {
                                  const next = formData.customDomains.filter((_, i) => i !== index);
                                  onChange("customDomains", next);
                                }}
                              >
                                <Icon icon="lucide:x" />
                              </Button>
                            </Flex>
                          ))}
                          <Button
                            type="button"
                            size="2"
                            variant="soft"
                            onClick={() =>
                              onChange("customDomains", [...formData.customDomains, ""])
                            }
                          >
                            <Icon icon="lucide:plus" />
                            {t("proxy.addCustomDomain")}
                          </Button>
                        </Flex>
                      </FormItem>
                      <FormItem label={t("proxy.subdomain")}>
                        <TextField.Root
                          size="2"
                          placeholder={t("proxy.subdomainPlaceholder")}
                          value={formData.subdomain}
                          onChange={(e) => onChange("subdomain", e.target.value)}
                        />
                        <Text size="1" color="gray" mt="1">
                          {t("proxy.subdomainDesc")}
                        </Text>
                      </FormItem>
                    </>
                  ) : !isXtcpType ? (
                    <FormItem label={t("proxy.remotePortLabel")} required error={errors.remotePort}>
                      <TextField.Root
                        size="2"
                        placeholder={t("proxy.remotePortPlaceholder")}
                        type="number"
                        value={formData.remotePort}
                        onChange={(e) => onChange("remotePort", e.target.value)}
                        color={errors.remotePort ? "red" : undefined}
                      />
                      <Text size="1" color="gray" mt="1">
                        {t("proxy.remotePortDesc")}
                      </Text>
                    </FormItem>
                  ) : null}

                  {isXtcpType && (
                    <Flex
                      direction="column"
                      gap="4"
                      className="rounded-md border border-[var(--gray-6)] p-4"
                    >
                      <FormItem label={t("proxy.xtcpSecretKey")} required error={errors.secretKey}>
                        <TextField.Root
                          size="2"
                          type="password"
                          value={formData.secretKey}
                          onChange={(e) => onChange("secretKey", e.target.value)}
                          placeholder={t("proxy.xtcpSecretKeyPlaceholder")}
                          autoComplete="new-password"
                        />
                      </FormItem>
                      <FormItem label={t("proxy.xtcpAllowUsers")}>
                        <TextField.Root
                          size="2"
                          value={formData.allowUsers.join(", ")}
                          onChange={(e) =>
                            onChange(
                              "allowUsers",
                              e.target.value.split(",").map((v) => v.trim())
                            )
                          }
                          placeholder={t("proxy.xtcpAllowUsersPlaceholder")}
                        />
                        <Text size="1" color="gray" mt="1">
                          {t("proxy.xtcpAllowUsersDesc")}
                        </Text>
                      </FormItem>
                      <Flex justify="between" align="center">
                        <Box>
                          <Text size="2" weight="medium">
                            {t("proxy.xtcpDisableAssisted")}
                          </Text>
                          <Text as="p" size="1" color="gray">
                            {t("proxy.xtcpDisableAssistedDesc")}
                          </Text>
                        </Box>
                        <Switch
                          checked={formData.disableAssistedAddrs}
                          onCheckedChange={(v) => onChange("disableAssistedAddrs", v)}
                        />
                      </Flex>
                    </Flex>
                  )}
                </Flex>
              </section>

              <Separator size="4" />

              {/* 传输选项 */}
              <section>
                <SectionHeading
                  id="section-transport"
                  title={t("proxy.sectionTransport")}
                  icon="lucide:shield"
                />
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="center">
                    <Box>
                      <Text size="2" weight="medium">
                        {t("proxy.transportEncryption")}
                      </Text>
                      <Text as="p" size="1" color="gray">
                        {t("proxy.transportEncryptionDesc")}
                      </Text>
                    </Box>
                    <Switch
                      size="2"
                      checked={formData.encryption}
                      onCheckedChange={(v) => onChange("encryption", v)}
                    />
                  </Flex>
                  <Separator size="4" />
                  <Flex justify="between" align="center">
                    <Box>
                      <Text size="2" weight="medium">
                        {t("proxy.dataCompression")}
                      </Text>
                      <Text as="p" size="1" color="gray">
                        {t("proxy.dataCompressionDesc")}
                      </Text>
                    </Box>
                    <Switch
                      size="2"
                      checked={formData.compression}
                      onCheckedChange={(v) => onChange("compression", v)}
                    />
                  </Flex>
                </Flex>
              </section>

              {!isXtcpType && (
                <>
                  <Separator size="4" />

                  {/* 插件 */}
                  <section>
                    <SectionHeading
                      id="section-plugin"
                      title={t("proxy.sectionPlugin")}
                      icon="lucide:puzzle"
                    />
                    <Flex direction="column" gap="4">
                      <Flex justify="between" align="center">
                        <Box>
                          <Text size="2" weight="medium">
                            {t("proxy.pluginEnable")}
                          </Text>
                          <Text as="p" size="1" color="gray">
                            {t("proxy.pluginEnableDesc")}
                          </Text>
                        </Box>
                        <Switch
                          size="2"
                          checked={formData.pluginEnabled}
                          onCheckedChange={(v) => onChange("pluginEnabled", v)}
                        />
                      </Flex>

                      <AnimatePresence>
                        {formData.pluginEnabled && (
                          <motion.div
                            key="plugin-fields"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <Flex
                              direction="column"
                              gap="4"
                              className="border-l-2 border-[var(--accent-6)] pl-4"
                            >
                              <FormItem label={t("proxy.pluginType")} required>
                                <RadioCardGroup
                                  options={BASE_PLUGIN_TYPES.map((pt) => ({
                                    ...pt,
                                    incompatible: pt.tcpOnly && formData.type !== "tcp",
                                    incompatibleLabel: t("proxy.pluginTcpOnly"),
                                  }))}
                                  value={formData.pluginType}
                                  onChange={(v) =>
                                    onChange("pluginType", v as ProxyFormData["pluginType"])
                                  }
                                  comingSoonLabel={t("common.comingSoon")}
                                />
                              </FormItem>

                              <FormItem label={t("proxy.pluginUsername")}>
                                <TextField.Root
                                  size="2"
                                  placeholder={t("proxy.pluginUsernamePlaceholder")}
                                  value={formData.pluginUsername}
                                  onChange={(e) => onChange("pluginUsername", e.target.value)}
                                  autoComplete="off"
                                />
                                <Text size="1" color="gray" mt="1">
                                  {t("proxy.pluginUsernameDesc")}
                                </Text>
                              </FormItem>

                              <FormItem label={t("proxy.pluginPassword")}>
                                <TextField.Root
                                  size="2"
                                  type="password"
                                  placeholder={t("proxy.pluginPasswordPlaceholder")}
                                  value={formData.pluginPassword}
                                  onChange={(e) => onChange("pluginPassword", e.target.value)}
                                  autoComplete="new-password"
                                />
                                <Text size="1" color="gray" mt="1">
                                  {t("proxy.pluginPasswordDesc")}
                                </Text>
                              </FormItem>
                            </Flex>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Flex>
                  </section>
                </>
              )}

              <Separator size="4" />

              {/* 描述 */}
              <section>
                <SectionHeading
                  id="section-description"
                  title={t("proxy.descriptionLabel")}
                  icon="lucide:file-text"
                />
                <TextArea
                  size="2"
                  placeholder={t("proxy.descriptionPlaceholder")}
                  value={formData.description}
                  onChange={(e) => onChange("description", e.target.value)}
                  className="min-h-[100px]"
                />
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
                  className="text-white [background:linear-gradient(135deg,var(--accent-9)_0%,var(--accent-10)_100%)]"
                >
                  {submitting ? (
                    <Spinner size="1" />
                  ) : isEditing ? (
                    <Icon icon="lucide:pencil" width="16" height="16" />
                  ) : (
                    <Icon icon="lucide:plus" width="16" height="16" />
                  )}
                  {submitting
                    ? isEditing
                      ? t("proxy.saving")
                      : t("proxy.adding")
                    : isEditing
                      ? t("proxy.saveChanges")
                      : t("proxy.addProxy")}
                </Button>
              </Flex>
            </Flex>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
