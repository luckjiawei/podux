import { useState, useEffect } from "react";
import { Box, Flex, Heading, Text, Separator, TextField, Button } from "@radix-ui/themes";
import { Icon } from "@iconify/react";
import { FormItem } from "../../components/FormItem";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface GeneralSettingsData {
  latencyCheckInterval: number;
  locationCheckInterval: number;
}

export function GeneralSettings() {
  const { t } = useTranslation();

  const [settings, setSettings] = useState<GeneralSettingsData>({
    latencyCheckInterval: 30,
    locationCheckInterval: 60,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/system/settings");
        if (response.ok) {
          const data = await response.json();
          if (data.general) {
            setSettings({
              latencyCheckInterval: data.general.latencyCheckInterval || 30,
              locationCheckInterval: data.general.locationCheckInterval || 60,
            });
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/system/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          general: settings,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast.success(t("settings.saveSuccess"));
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error(t("settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      latencyCheckInterval: 30,
      locationCheckInterval: 60,
    });
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "400px" }}>
        <Icon icon="eos-icons:loading" width="32" height="32" />
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <Box>
        <Heading size="4" mb="1">
          {t("settings.generalSettings")}
        </Heading>
        <Text size="2" color="gray">
          {t("settings.configureApp")}
        </Text>
      </Box>

      <Separator size="4" />

      {/* Monitor Settings */}
      <Box>
        <Text size="3" weight="bold" mb="3" style={{ display: "block" }}>
          {t("settings.monitorSettings")}
        </Text>

        <Flex direction="column" gap="3">
          <FormItem label={t("settings.latencyCheckInterval")} required>
            <Flex align="center" gap="2">
              <TextField.Root
                type="number"
                min="10"
                max="300"
                value={settings.latencyCheckInterval.toString()}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    latencyCheckInterval: parseInt(e.target.value) || 30,
                  })
                }
                size="2"
                style={{ flex: 1 }}
              />
              <Text size="2" color="gray">
                {t("settings.seconds")}
              </Text>
            </Flex>
            <Text size="1" color="gray" mt="1" style={{ display: "block" }}>
              {t("settings.latencyCheckIntervalDesc")}
            </Text>
          </FormItem>

          <FormItem label={t("settings.locationCheckInterval")} required>
            <Flex align="center" gap="2">
              <TextField.Root
                type="number"
                min="30"
                max="600"
                value={settings.locationCheckInterval.toString()}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    locationCheckInterval: parseInt(e.target.value) || 60,
                  })
                }
                size="2"
                style={{ flex: 1 }}
              />
              <Text size="2" color="gray">
                {t("settings.seconds")}
              </Text>
            </Flex>
            <Text size="1" color="gray" mt="1" style={{ display: "block" }}>
              {t("settings.locationCheckIntervalDesc")}
            </Text>
          </FormItem>
        </Flex>
      </Box>

      <Separator size="4" />

      {/* Save Button */}
      <Flex justify="end" gap="3">
        <Button variant="soft" color="gray" size="2" onClick={handleReset} disabled={saving}>
          {t("common.reset")}
        </Button>
        <Button size="2" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Icon icon="eos-icons:loading" width="16" height="16" />
          ) : (
            <Icon icon="lucide:check" width="16" height="16" />
          )}
          {saving ? t("settings.saving") : t("settings.saveChanges")}
        </Button>
      </Flex>
    </Flex>
  );
}
