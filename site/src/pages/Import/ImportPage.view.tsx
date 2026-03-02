import {
  Box,
  Button,
  Card,
  Flex,
  Text,
  Badge,
  TextArea,
  TextField,
  Separator,
  Switch,
  Checkbox,
  Table,
  Callout,
  Tabs,
} from "@radix-ui/themes";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../components/PageHeader";
import type { useImport } from "./useImport";

type ImportViewProps = ReturnType<typeof useImport> & { visible: boolean };

// ────────────────────────────────────────────────────────────
// Step indicator
// ────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  const { t } = useTranslation();
  const steps = [
    { label: t("import.step1Label"), icon: "lucide:file-text" },
    { label: t("import.step2Label"), icon: "lucide:eye" },
    { label: t("import.step3Label"), icon: "lucide:check-circle" },
  ];
  return (
    <Flex align="center" gap="0" mb="6">
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = current > idx;
        const active = current === idx;
        return (
          <Flex key={idx} align="center" style={{ flex: 1 }}>
            <Flex direction="column" align="center" gap="1" style={{ flex: 1 }}>
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: done
                    ? "var(--green-9)"
                    : active
                      ? "var(--accent-9)"
                      : "var(--gray-4)",
                  color: done || active ? "white" : "var(--gray-9)",
                  transition: "background 0.3s",
                }}
              >
                {done ? (
                  <Icon icon="lucide:check" width="16" height="16" />
                ) : (
                  <Icon icon={s.icon} width="16" height="16" />
                )}
              </Box>
              <Text size="1" color={active ? "blue" : "gray"} weight={active ? "bold" : "regular"}>
                {s.label}
              </Text>
            </Flex>
            {i < steps.length - 1 && (
              <Box
                style={{
                  height: 2,
                  flex: 1,
                  background: done ? "var(--green-9)" : "var(--gray-4)",
                  marginBottom: 20,
                  transition: "background 0.3s",
                }}
              />
            )}
          </Flex>
        );
      })}
    </Flex>
  );
}

// ────────────────────────────────────────────────────────────
// Step 1: Input TOML
// ────────────────────────────────────────────────────────────
function Step1({
                 tomlContent,
                 setTomlContent,
                 parseError,
                 parsing,
                 handleFileUpload,
                 handleParse,
               }: Pick<
  ImportViewProps,
  "tomlContent" | "setTomlContent" | "parseError" | "parsing" | "handleFileUpload" | "handleParse"
>) {
  const { t } = useTranslation();
  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Text size="3" weight="bold">
          {t("import.inputTomlTitle")}
        </Text>
        <Flex gap="2">
          <input
            type="file"
            id="toml-file-input"
            accept=".toml"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <Button
            variant="soft"
            size="2"
            onClick={() => document.getElementById("toml-file-input")?.click()}
          >
            <Icon icon="lucide:upload" width="14" height="14" />
            {t("import.uploadFile")}
          </Button>
        </Flex>
      </Flex>

      <Text size="2" color="gray">
        {t("import.inputTomlDesc")}
      </Text>

      <TextArea
        size="2"
        placeholder={t("import.tomlPlaceholder")}
        value={tomlContent}
        onChange={(e) => setTomlContent(e.target.value)}
        style={{
          minHeight: 320,
          fontFamily: "monospace",
          fontSize: 13,
        }}
      />

      {parseError && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <Icon icon="lucide:alert-circle" width="16" height="16" />
          </Callout.Icon>
          <Callout.Text>{parseError}</Callout.Text>
        </Callout.Root>
      )}

      <Flex justify="end">
        <Button size="2" onClick={handleParse} disabled={parsing || !tomlContent.trim()}>
          {parsing ? (
            <Icon icon="lucide:loader-2" width="14" height="14" className="animate-spin" />
          ) : (
            <Icon icon="lucide:scan-text" width="14" height="14" />
          )}
          {parsing ? t("import.parsing") : t("import.parseAndPreview")}
        </Button>
      </Flex>
    </Flex>
  );
}

// ────────────────────────────────────────────────────────────
// Step 2: Preview
// ────────────────────────────────────────────────────────────
function Step2({
                 preview,
                 serverName,
                 setServerName,
                 importServer,
                 setImportServer,
                 overwriteServer,
                 setOverwriteServer,
                 proxySelections,
                 updateProxySelection,
                 selectAllProxies,
                 selectedProxiesCount,
                 importing,
                 handleExecute,
                 goBack,
               }: Pick<
  ImportViewProps,
  | "preview"
  | "serverName"
  | "setServerName"
  | "importServer"
  | "setImportServer"
  | "overwriteServer"
  | "setOverwriteServer"
  | "proxySelections"
  | "updateProxySelection"
  | "selectAllProxies"
  | "selectedProxiesCount"
  | "importing"
  | "handleExecute"
  | "goBack"
>) {
  const { t } = useTranslation();
  if (!preview) return null;

  const allSelected = proxySelections.length > 0 && proxySelections.every((s) => s.import);
  const someSelected = proxySelections.some((s) => s.import);

  const tls = preview.server.transport.tls as Record<string, unknown> | undefined;

  return (
    <Flex direction="column" gap="5">
      {/* ── Server Section ── */}
      <Card>
        <Flex direction="column" gap="3">
          {/* Header */}
          <Flex align="center" gap="2" mb="1">
            <Icon icon="lucide:server" width="18" height="18" color="var(--accent-9)" />
            <Text size="3" weight="bold">
              {t("import.serverSection")}
            </Text>
            {preview.server.isDuplicate && (
              <Badge color="orange" variant="soft" size="1">
                <Icon icon="lucide:alert-triangle" width="12" height="12" />
                {t("import.duplicate")}
              </Badge>
            )}
          </Flex>

          <Separator size="4" />

          {/* Duplicate warning */}
          {preview.server.isDuplicate && (
            <Callout.Root color="orange" size="1">
              <Callout.Icon>
                <Icon icon="lucide:alert-triangle" width="14" height="14" />
              </Callout.Icon>
              <Callout.Text>{t("import.serverDuplicateWarning")}</Callout.Text>
            </Callout.Root>
          )}

          {/* Tabs */}
          <Tabs.Root defaultValue="general">
            <Tabs.List>
              <Tabs.Trigger value="general">{t("server.general")}</Tabs.Trigger>
              <Tabs.Trigger value="log">{t("server.log")}</Tabs.Trigger>
              <Tabs.Trigger value="transport">{t("server.transport")}</Tabs.Trigger>
              <Tabs.Trigger value="metadatas">{t("server.metadatas")}</Tabs.Trigger>
            </Tabs.List>

            <Box pt="3">
              {/* General */}
              <Tabs.Content value="general">
                <Flex direction="column" gap="3">
                  <Flex gap="3">
                    <Box style={{ flex: 1 }}>
                      <Text size="1" color="gray" mb="1" as="div">
                        {t("import.serverName")}
                      </Text>
                      <TextField.Root
                        size="2"
                        value={serverName}
                        onChange={(e) => setServerName(e.target.value)}
                        placeholder={t("import.serverNamePlaceholder")}
                      />
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Text size="1" color="gray" mb="1" as="div">
                        {t("import.serverAddr")}
                      </Text>
                      <Text size="2" style={{ fontFamily: "monospace", lineHeight: "32px" }}>
                        {preview.server.serverAddr}:{preview.server.serverPort}
                      </Text>
                    </Box>
                  </Flex>
                  <Flex gap="3">
                    <Box style={{ flex: 1 }}>
                      <Text size="1" color="gray" mb="1" as="div">
                        {t("import.authMethod")}
                      </Text>
                      <Badge variant="surface" size="1">
                        {(preview.server.auth.method as string) || "none"}
                      </Badge>
                    </Box>
                    {(preview.server.auth.method as string) === "token" && (
                      <Box style={{ flex: 1 }}>
                        <Text size="1" color="gray" mb="1" as="div">
                          {t("server.token")}
                        </Text>
                        <Text size="2" style={{ fontFamily: "monospace" }}>
                          ••••••••
                        </Text>
                      </Box>
                    )}
                  </Flex>
                </Flex>
              </Tabs.Content>

              {/* Log */}
              <Tabs.Content value="log">
                <Flex gap="3">
                  <Box style={{ flex: 1 }}>
                    <Text size="1" color="gray" mb="1" as="div">
                      {t("server.logLevel")}
                    </Text>
                    <Badge variant="surface" size="1">
                      {(preview.server.log.level as string) || "info"}
                    </Badge>
                  </Box>
                  <Box style={{ flex: 1 }}>
                    <Text size="1" color="gray" mb="1" as="div">
                      {t("server.maxDays")}
                    </Text>
                    <Text size="2">{String(preview.server.log.maxDays ?? 3)}</Text>
                  </Box>
                </Flex>
              </Tabs.Content>

              {/* Transport */}
              <Tabs.Content value="transport">
                <Flex direction="column" gap="3">
                  <Flex gap="3">
                    <Box style={{ flex: 1 }}>
                      <Text size="1" color="gray" mb="1" as="div">
                        {t("server.protocol")}
                      </Text>
                      <Badge variant="surface" size="1">
                        {(preview.server.transport.protocol as string) || "tcp"}
                      </Badge>
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Text size="1" color="gray" mb="1" as="div">
                        {t("server.proxyUrl")}
                      </Text>
                      <Text size="2">{(preview.server.transport.proxyURL as string) || "—"}</Text>
                    </Box>
                  </Flex>
                  <Flex gap="3">
                    <Box style={{ flex: 1 }}>
                      <Text size="1" color="gray" mb="1" as="div">
                        {t("server.tlsEnable")}
                      </Text>
                      <Badge color={tls?.enable ? "green" : "gray"} variant="soft" size="1">
                        {tls?.enable ? t("server.enabled") : t("server.disabled")}
                      </Badge>
                    </Box>
                    {(tls?.enable && tls?.serverName) ? (
                      <Box style={{ flex: 1 }}>
                        <Text size="1" color="gray" mb="1" as="div">
                          {t("server.serverNameSNI")}
                        </Text>
                        <Text size="2" style={{ fontFamily: "monospace" }}>
                          {tls.serverName as string}
                        </Text>
                      </Box>
                    ) : (<div></div>)}
                  </Flex>
                </Flex>
              </Tabs.Content>

              {/* Metadatas */}
              <Tabs.Content value="metadatas">
                {Object.keys(preview.server.metadatas).length === 0 ? (
                  <Text size="2" color="gray" as="div" style={{ padding: "0.5rem 0" }}>
                    {t("server.noMetadata")}
                  </Text>
                ) : (
                  <Table.Root variant="surface">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>{t("server.metadataKey")}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t("server.metadataValue")}</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {Object.entries(preview.server.metadatas).map(([k, v]) => (
                        <Table.Row key={k}>
                          <Table.Cell>{k}</Table.Cell>
                          <Table.Cell>{v}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}
              </Tabs.Content>
            </Box>
          </Tabs.Root>

          {/* Import controls */}
          <Separator size="4" />
          <Flex gap="6" align="center" wrap="wrap">
            <Flex align="center" gap="2">
              <Switch checked={importServer} onCheckedChange={setImportServer} size="1" />
              <Text size="2">{t("import.importServer")}</Text>
            </Flex>
            {importServer && preview.server.isDuplicate && (
              <Flex align="center" gap="2">
                <Switch checked={overwriteServer} onCheckedChange={setOverwriteServer} size="1" />
                <Text size="2" color="orange">
                  {t("import.overwriteServer")}
                </Text>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* ── Proxy Section ── */}
      <Card>
        <Flex direction="column" gap="3">
          <Flex align="center" justify="between" mb="1">
            <Flex align="center" gap="2">
              <Icon icon="lucide:network" width="18" height="18" color="var(--accent-9)" />
              <Text size="3" weight="bold">
                {t("import.proxySection")}
              </Text>
              <Badge variant="surface" size="1">
                {preview.proxies.length}
              </Badge>
            </Flex>
            <Flex gap="2">
              <Button size="1" variant="soft" onClick={() => selectAllProxies(true)}>
                {t("import.selectAll")}
              </Button>
              <Button size="1" variant="soft" color="gray" onClick={() => selectAllProxies(false)}>
                {t("import.deselectAll")}
              </Button>
            </Flex>
          </Flex>

          <Separator size="4" />

          {preview.proxies.length === 0 ? (
            <Text size="2" color="gray" align="center" as="div" style={{ padding: "1rem 0" }}>
              {t("import.noProxies")}
            </Text>
          ) : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell width="40px">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => selectAllProxies(v === true)}
                    />
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("common.name")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("common.type")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("import.local")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("import.remote")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("common.status")}</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>{t("import.overwrite")}</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {preview.proxies.map((proxy) => {
                  const sel = proxySelections.find((s) => s.name === proxy.name);
                  const isImport = sel?.import ?? true;
                  const isOverwrite = sel?.overwrite ?? false;
                  return (
                    <Table.Row key={proxy.name} style={{ opacity: isImport ? 1 : 0.45 }}>
                      <Table.Cell>
                        <Checkbox
                          checked={isImport}
                          onCheckedChange={(v) =>
                            updateProxySelection(proxy.name, "import", v === true)
                          }
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <Flex align="center" gap="2">
                          <Text size="2" weight="medium">
                            {proxy.name}
                          </Text>
                          {proxy.isDuplicate && (
                            <Badge color="orange" variant="soft" size="1">
                              <Icon icon="lucide:alert-triangle" width="11" height="11" />
                              {t("import.duplicate")}
                            </Badge>
                          )}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant="surface" size="1">
                          {proxy.type}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" className="font-mono">
                          {proxy.localIP || "127.0.0.1"}:{proxy.localPort || "-"}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" className="font-mono">
                          {proxy.remotePort || proxy.subdomain || proxy.customDomains?.[0] || "-"}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        {proxy.isDuplicate ? (
                          <Badge color="orange" variant="soft" size="1">
                            {t("import.exists")}
                          </Badge>
                        ) : (
                          <Badge color="green" variant="soft" size="1">
                            {t("import.new")}
                          </Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {proxy.isDuplicate && isImport ? (
                          <Switch
                            size="1"
                            checked={isOverwrite}
                            onCheckedChange={(v) =>
                              updateProxySelection(proxy.name, "overwrite", v)
                            }
                          />
                        ) : (
                          <Text size="1" color="gray">
                            —
                          </Text>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          )}

          <Flex justify="end" gap="2" mt="2">
            <Text size="1" color="gray" style={{ alignSelf: "center" }}>
              {t("import.selectedCount", { count: selectedProxiesCount })}
            </Text>
          </Flex>
        </Flex>
      </Card>

      {/* ── Actions ── */}
      <Flex justify="between">
        <Button variant="soft" color="gray" size="2" onClick={goBack}>
          <Icon icon="lucide:arrow-left" width="14" height="14" />
          {t("common.back")}
        </Button>
        <Button
          size="2"
          onClick={handleExecute}
          disabled={importing || (!importServer && selectedProxiesCount === 0)}
          style={{
            background: "linear-gradient(135deg, var(--accent-9) 0%, var(--accent-10) 100%)",
            color: "white",
          }}
        >
          {importing ? (
            <Icon icon="lucide:loader-2" width="14" height="14" className="animate-spin" />
          ) : (
            <Icon icon="lucide:download" width="14" height="14" />
          )}
          {importing ? t("import.importing") : t("import.confirmImport")}
        </Button>
      </Flex>
    </Flex>
  );
}

// ────────────────────────────────────────────────────────────
// Step 3: Result
// ────────────────────────────────────────────────────────────
function Step3({ result, handleReset }: Pick<ImportViewProps, "result" | "handleReset">) {
  const { t } = useTranslation();
  if (!result) return null;
  return (
    <Flex direction="column" align="center" gap="5" py="6">
      <Box
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "var(--green-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon icon="lucide:check-circle-2" width="40" height="40" color="var(--green-9)" />
      </Box>

      <Flex direction="column" align="center" gap="1">
        <Text size="5" weight="bold">
          {t("import.successTitle")}
        </Text>
        <Text size="2" color="gray">
          {t("import.successDesc")}
        </Text>
      </Flex>

      <Card style={{ width: "100%", maxWidth: 400 }}>
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <Icon icon="lucide:server" width="16" height="16" color="var(--gray-9)" />
              <Text size="2">{t("import.serverResult")}</Text>
            </Flex>
            <Badge color={result.serverImported ? "green" : "gray"} variant="soft">
              {result.serverImported ? t("import.imported") : t("import.skipped")}
            </Badge>
          </Flex>
          <Separator size="4" />
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <Icon icon="lucide:network" width="16" height="16" color="var(--gray-9)" />
              <Text size="2">{t("import.proxiesImported")}</Text>
            </Flex>
            <Badge color="green" variant="soft">
              {result.proxiesImported}
            </Badge>
          </Flex>
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <Icon icon="lucide:skip-forward" width="16" height="16" color="var(--gray-9)" />
              <Text size="2">{t("import.proxiesSkipped")}</Text>
            </Flex>
            <Badge color="gray" variant="soft">
              {result.proxiesSkipped}
            </Badge>
          </Flex>
        </Flex>
      </Card>

      <Flex gap="3">
        <Button variant="soft" size="2" onClick={handleReset}>
          <Icon icon="lucide:plus" width="14" height="14" />
          {t("import.importAnother")}
        </Button>
        <Button
          size="2"
          onClick={() => (window.location.href = "/servers")}
          style={{
            background: "linear-gradient(135deg, var(--accent-9) 0%, var(--accent-10) 100%)",
            color: "white",
          }}
        >
          <Icon icon="lucide:server" width="14" height="14" />
          {t("import.viewServers")}
        </Button>
      </Flex>
    </Flex>
  );
}

// ────────────────────────────────────────────────────────────
// Main View
// ────────────────────────────────────────────────────────────
export function ImportPageView(props: ImportViewProps) {
  const { t } = useTranslation();
  const { step, visible } = props;

  return (
    <Flex direction="column" gap="5" className="flex flex-1 flex-col">
      <PageHeader
        title={t("import.title")}
        description={t("import.description")}
        visible={visible}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <Card>
          <Box p="2">
            <StepIndicator current={step} />

            {step === 1 && (
              <Step1
                tomlContent={props.tomlContent}
                setTomlContent={props.setTomlContent}
                parseError={props.parseError}
                parsing={props.parsing}
                handleFileUpload={props.handleFileUpload}
                handleParse={props.handleParse}
              />
            )}

            {step === 2 && (
              <Step2
                preview={props.preview}
                serverName={props.serverName}
                setServerName={props.setServerName}
                importServer={props.importServer}
                setImportServer={props.setImportServer}
                overwriteServer={props.overwriteServer}
                setOverwriteServer={props.setOverwriteServer}
                proxySelections={props.proxySelections}
                updateProxySelection={props.updateProxySelection}
                selectAllProxies={props.selectAllProxies}
                selectedProxiesCount={props.selectedProxiesCount}
                importing={props.importing}
                handleExecute={props.handleExecute}
                goBack={props.goBack}
              />
            )}

            {step === 3 && <Step3 result={props.result} handleReset={props.handleReset} />}
          </Box>
        </Card>
      </motion.div>
    </Flex>
  );
}
