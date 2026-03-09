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
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { FormItem } from "../../../components/FormItem";
import { PageHeader } from "../../../components/PageHeader";
import { type ProxyFormData } from "./useProxyForm";

const proxyTypes = [
  { value: "tcp", label: "TCP", description: "TCP Port Forwarding" },
  { value: "udp", label: "UDP", description: "UDP Port Forwarding" },
  { value: "http", label: "HTTP", description: "HTTP Reverse Proxy" },
  { value: "https", label: "HTTPS", description: "HTTPS Reverse Proxy" },
  { value: "stcp", label: "STCP", description: "Secure TCP Tunnel", disabled: true },
  { value: "xtcp", label: "XTCP", description: "P2P TCP Tunnel", disabled: true },
];

const SECTIONS = [
  { id: "section-basic", labelKey: "proxy.sectionBasic" },
  { id: "section-network", labelKey: "proxy.sectionNetwork" },
  { id: "section-transport", labelKey: "proxy.sectionTransport" },
  { id: "section-description", labelKey: "proxy.descriptionLabel" },
];

interface ProxyFormPageViewProps {
  isEditing: boolean;
  formData: ProxyFormData;
  servers: { id: string; serverName: string }[];
  loadingServers: boolean;
  loadingProxy: boolean;
  submitting: boolean;
  errors: Partial<Record<keyof ProxyFormData, string>>;
  isHttpType: boolean;
  isSubmitDisabled: boolean;
  mounted: boolean;
  onChange: (field: keyof ProxyFormData, value: string | boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onNavigateToServers: () => void;
}

function SectionHeading({ id, title, icon }: { id: string; title: string; icon: string }) {
  return (
    <div id={id} style={{ scrollMarginTop: 24 }}>
      <Flex align="center" gap="2" mb="4">
        <Box
          style={{
            background: "linear-gradient(135deg, var(--accent-9), var(--accent-10))",
            borderRadius: 8,
            padding: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon icon={icon} width="16" height="16" color="white" />
        </Box>
        <Text size="4" weight="bold">
          {title}
        </Text>
      </Flex>
    </div>
  );
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
  isSubmitDisabled,
  mounted,
  onChange,
  onSubmit,
  onCancel,
  onNavigateToServers,
}: ProxyFormPageViewProps) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState("section-basic");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [loadingProxy]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  if (loadingProxy) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "60vh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="5" className="flex flex-1 flex-col">
      <PageHeader
        title={isEditing ? t("proxy.editProxy") : t("proxy.addProxy")}
        description={isEditing ? t("proxy.updateProxyDesc") : t("proxy.addProxyDesc")}
        visible={mounted}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        style={{ flex: 1 }}
      >
        <Flex gap="8" align="start">
          {/* ── Main content ── */}
          <Flex direction="column" gap="8" style={{ flex: 1, maxWidth: 600 }}>

            {/* 基本信息 */}
            <section>
              <SectionHeading id="section-basic" title={t("proxy.sectionBasic")} icon="lucide:info" />
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
                          {s.serverName}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  {servers.length === 0 && !loadingServers && (
                    <Callout.Root size="1" color="orange" mt="2">
                      <Callout.Icon>
                        <Icon icon="lucide:triangle-alert" width="14" height="14" />
                      </Callout.Icon>
                      <Callout.Text asChild>
                        <div>
                          <Flex align="center" justify="between" gap="2">
                            <Text size="1">{t("proxy.noServersAvailable")}</Text>
                            <Button
                              size="1"
                              variant="ghost"
                              color="orange"
                              style={{ cursor: "pointer", flexShrink: 0 }}
                              onClick={onNavigateToServers}
                            >
                              {t("proxy.goAddServer")}
                              <Icon icon="lucide:arrow-right" width="12" height="12" />
                            </Button>
                          </Flex>
                        </div>
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
                  <Flex gap="2" wrap="wrap">
                    {proxyTypes.map((pt) => (
                      <Box
                        key={pt.value}
                        onClick={() =>
                          !pt.disabled && onChange("type", pt.value as ProxyFormData["type"])
                        }
                        className={`box-border min-w-[64px] rounded-lg border-2 px-3 py-2 text-center transition-all duration-200 ${
                          pt.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                        } ${
                          formData.type === pt.value
                            ? "border-[var(--accent-9)] bg-[var(--accent-3)]"
                            : "border-[var(--gray-5)] bg-[var(--gray-2)]"
                        }`}
                      >
                        <Text
                          size="1"
                          weight={formData.type === pt.value ? "bold" : "regular"}
                          color={
                            pt.disabled ? "gray" : formData.type === pt.value ? "blue" : "gray"
                          }
                        >
                          {pt.label}
                        </Text>
                      </Box>
                    ))}
                  </Flex>
                </FormItem>
              </Flex>
            </section>

            <Separator size="4" />

            {/* 网络配置 */}
            <section>
              <SectionHeading id="section-network" title={t("proxy.sectionNetwork")} icon="lucide:network" />
              <Flex direction="column" gap="4">
                <Flex gap="3">
                  <Box style={{ flex: 2 }}>
                    <FormItem label={t("proxy.localAddress")} required error={errors.localIp}>
                      <TextField.Root
                        size="2"
                        placeholder={t("proxy.localAddressPlaceholder")}
                        value={formData.localIp}
                        onChange={(e) => onChange("localIp", e.target.value)}
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
                        onChange={(e) => onChange("localPort", e.target.value)}
                        color={errors.localPort ? "red" : undefined}
                      />
                    </FormItem>
                  </Box>
                </Flex>

                {isHttpType ? (
                  <>
                    <FormItem label={t("proxy.customDomainsLabel")}>
                      <TextField.Root
                        size="2"
                        placeholder={t("proxy.customDomainsPlaceholder")}
                        value={formData.customDomains}
                        onChange={(e) => onChange("customDomains", e.target.value)}
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
                        onChange={(e) => onChange("subdomain", e.target.value)}
                      />
                      <Text size="1" color="gray" mt="1">
                        {t("proxy.subdomainDesc")}
                      </Text>
                    </FormItem>
                  </>
                ) : (
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
                )}
              </Flex>
            </section>

            <Separator size="4" />

            {/* 传输选项 */}
            <section>
              <SectionHeading id="section-transport" title={t("proxy.sectionTransport")} icon="lucide:shield" />
              <Flex direction="column" gap="3">
                <Flex justify="between" align="center">
                  <Box>
                    <Text size="2" weight="medium">{t("proxy.transportEncryption")}</Text>
                    <Text as="p" size="1" color="gray">{t("proxy.transportEncryptionDesc")}</Text>
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
                    <Text size="2" weight="medium">{t("proxy.dataCompression")}</Text>
                    <Text as="p" size="1" color="gray">{t("proxy.dataCompressionDesc")}</Text>
                  </Box>
                  <Switch
                    size="2"
                    checked={formData.compression}
                    onCheckedChange={(v) => onChange("compression", v)}
                  />
                </Flex>
              </Flex>
            </section>

            <Separator size="4" />

            {/* 描述 */}
            <section>
              <SectionHeading id="section-description" title={t("proxy.descriptionLabel")} icon="lucide:file-text" />
              <TextArea
                size="2"
                placeholder={t("proxy.descriptionPlaceholder")}
                value={formData.description}
                onChange={(e) => onChange("description", e.target.value)}
                style={{ minHeight: 100 }}
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
                disabled={isSubmitDisabled}
                onClick={onSubmit}
                style={{
                  background: "linear-gradient(135deg, var(--accent-9) 0%, var(--accent-10) 100%)",
                  color: "white",
                }}
              >
                {submitting ? (
                  <Spinner size="1" />
                ) : isEditing ? (
                  <Icon icon="lucide:pencil" width="16" height="16" color="white" />
                ) : (
                  <Icon icon="lucide:plus" width="16" height="16" color="white" />
                )}
                {submitting
                  ? isEditing ? t("proxy.saving") : t("proxy.adding")
                  : isEditing ? t("proxy.saveChanges") : t("proxy.addProxy")}
              </Button>
            </Flex>
          </Flex>

          {/* ── TOC sidebar ── */}
          <Box
            style={{
              position: "sticky",
              top: 24,
              width: 160,
              flexShrink: 0,
            }}
            className="hidden lg:block"
          >
            <Text size="1" weight="bold" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {t("common.onThisPage")}
            </Text>
            <Flex direction="column" gap="1" mt="3">
              {SECTIONS.map(({ id, labelKey }) => {
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 0",
                      textAlign: "left",
                    }}
                  >
                    <Box
                      style={{
                        width: 3,
                        height: 16,
                        borderRadius: 2,
                        background: isActive ? "var(--accent-9)" : "var(--gray-4)",
                        transition: "background 0.2s",
                        flexShrink: 0,
                      }}
                    />
                    <Text
                      size="2"
                      color={isActive ? "blue" : "gray"}
                      weight={isActive ? "medium" : "regular"}
                      style={{ transition: "color 0.2s" }}
                    >
                      {t(labelKey)}
                    </Text>
                  </button>
                );
              })}
            </Flex>
          </Box>
        </Flex>
      </motion.div>
    </Flex>
  );
}
