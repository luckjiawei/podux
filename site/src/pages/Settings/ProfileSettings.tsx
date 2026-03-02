import { useState, useRef } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Separator,
  TextField,
  Button,
  Avatar,
  Badge,
} from "@radix-ui/themes";
import { Icon } from "@iconify/react";
import { FormItem } from "../../components/FormItem";
import pb from "../../lib/pocketbase";
import { getGravatarUrl } from "../../lib/gravatar";
import { getTimeAgo } from "../../lib/format";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { useTranslation } from "react-i18next";

export function ProfileSettings() {
  const { t } = useTranslation();
  const [nickname, setNickname] = useState(
    pb.authStore.record?.name || pb.authStore.record?.nickname || ""
  );
  const [email, setEmail] = useState(pb.authStore.record?.email || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get the timestamp for password last changed
  const getPasswordChangeTimestamp = () => {
    const record = pb.authStore.record;
    if (!record) return null;

    // Use passwordChangedAt if available, otherwise fall back to updated
    return record.passwordChangedAt || record.updated || null;
  };

  // Helper to get current avatar URL
  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (pb.authStore.record?.avatar) {
      return pb.files.getURL(pb.authStore.record, pb.authStore.record.avatar);
    }
    return getGravatarUrl(pb.authStore.record?.email || "", 200);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!pb.authStore.model) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", nickname); // Common field for name/nickname
      formData.append("nickname", nickname); // Just in case schema uses nickname
      // Email updates often require verification in PB, but we'll try updating it.
      // If email changes, PB might require token re-auth or email confirm.
      if (email !== pb.authStore.model.email) {
        formData.append("email", email);
      }

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      await pb.collection("fh_users").update(pb.authStore.record!.id, formData);

      // Force refresh/reload might be needed or just let PB auth store update reactively
      window.location.reload(); // Simple way to refresh state across app
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Flex direction="column" gap="4">
      <Box>
        <Heading size="4" mb="1">
          {t("settings.userProfile")}
        </Heading>
        <Text size="2" color="gray">
          {t("settings.managePersonalInfo")}
        </Text>
      </Box>

      <Separator size="4" />

      {/* Profile Header Card */}
      <Box
        style={{
          padding: "24px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, var(--accent-3) 0%, var(--accent-2) 100%)",
          border: "1px solid var(--accent-6)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "var(--accent-4)",
            opacity: 0.3,
          }}
        />
        <Flex align="center" gap="5" style={{ position: "relative" }}>
          <Box style={{ position: "relative" }}>
            <Avatar
              size="6"
              src={getAvatarUrl()}
              fallback={nickname.charAt(0).toUpperCase() || "U"}
              radius="full"
              style={{
                border: "3px solid var(--color-background)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
                objectFit: "cover",
              }}
            />
            <Box
              style={{
                position: "absolute",
                bottom: "0px",
                right: "0px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-9)",
                border: "2px solid var(--color-background)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              className="avatar-edit-btn"
              onClick={handleAvatarClick}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </Box>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*"
              onChange={handleFileChange}
            />
          </Box>
          <Flex direction="column" gap="2" style={{ flex: 1 }}>
            <Flex align="center" gap="3">
              <Heading size="5">{nickname || "User"}</Heading>
              <Badge color="green" variant="soft" size="2">
                <Flex align="center" gap="1">
                  <Box
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "var(--green-9)",
                    }}
                  />
                  {t("settings.active")}
                </Flex>
              </Badge>
            </Flex>
            <Text size="3" color="gray">
              {email || ""}
            </Text>
          </Flex>
        </Flex>
      </Box>

      {/* Personal Information */}
      <Box>
        <Text size="3" weight="bold" mb="3" style={{ display: "block" }}>
          {t("settings.personalInformation")}
        </Text>

        <Flex direction="column" gap="3">
          <FormItem label={t("settings.displayName")} required>
            <TextField.Root
              placeholder={t("settings.enterDisplayName")}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              size="2"
            />
          </FormItem>

          <FormItem label={t("settings.emailAddress")} required>
            <TextField.Root
              placeholder={t("settings.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              size="2"
              type="email"
            />
            <Text size="1" color="gray" mt="1" style={{ display: "block" }}>
              {t("settings.emailDescription")}
            </Text>
          </FormItem>
        </Flex>
      </Box>

      <Separator size="4" />

      {/* Security Settings */}
      <Box>
        <Text size="3" weight="bold" mb="3" style={{ display: "block" }}>
          {t("settings.security")}
        </Text>

        <Flex direction="column" gap="4">
          <Box
            style={{
              padding: "16px",
              borderRadius: "12px",
              backgroundColor: "var(--gray-2)",
              border: "1px solid var(--gray-5)",
            }}
          >
            <Flex justify="between" align="center">
              <Box>
                <Text size="2" weight="medium" mb="1" style={{ display: "block" }}>
                  {t("settings.password")}
                </Text>
                <Text size="2" color="gray">
                  {t("settings.lastChanged")} {getTimeAgo(getPasswordChangeTimestamp())}
                </Text>
              </Box>
              <Button variant="soft" size="1" onClick={() => setIsPasswordDialogOpen(true)}>
                {t("settings.changePassword")}
              </Button>
            </Flex>
          </Box>
        </Flex>
      </Box>

      <Separator size="4" />

      {/* Save Button */}
      <Flex justify="end" gap="3">
        <Button variant="soft" color="gray" size="2" onClick={() => window.location.reload()}>
          {t("common.cancel")}
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

      <ChangePasswordDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} />
    </Flex>
  );
}
