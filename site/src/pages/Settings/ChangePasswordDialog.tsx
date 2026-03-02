import { useState } from "react";
import { Dialog, Button, Flex, TextField, Callout } from "@radix-ui/themes";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { FormItem } from "../../components/FormItem";
import pb from "../../lib/pocketbase";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError(t("settings.fillAllFields"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("settings.passwordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("settings.passwordTooShort"));
      return;
    }

    setLoading(true);
    try {
      if (!pb.authStore.record) throw new Error("User not authenticated");

      const userEmail = pb.authStore.record.email;
      const collectionName = pb.authStore.record.collectionName || "fh_users";

      console.log("Updating password for user:", pb.authStore.record.id);
      console.log("Collection:", collectionName);

      // First, verify the old password by attempting to re-authenticate
      try {
        await pb.collection(collectionName).authWithPassword(userEmail, oldPassword);
        console.log("Old password verified successfully");
      } catch (authErr: any) {
        console.error("Old password verification failed:", authErr);
        setError(t("settings.incorrectPassword"));
        setLoading(false);
        return;
      }

      // Now update the password
      await pb.collection(collectionName).update(pb.authStore.record.id, {
        oldPassword: oldPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
        passwordChangedAt: new Date().toISOString(),
      });

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("settings.passwordUpdateSuccess"));
      onOpenChange(false);

      // Logout and redirect to login page
      pb.authStore.clear();
      navigate("/login", { replace: true });
    } catch (err: any) {
      console.error("Password update error:", err);

      // Handle PocketBase validation errors
      if (err.response?.data) {
        const data = err.response.data;
        if (data.oldPassword) {
          setError(t("settings.incorrectPassword"));
        } else if (data.password) {
          setError(data.password.message || t("settings.passwordsDoNotMatch"));
        } else if (data.passwordConfirm) {
          setError(data.passwordConfirm.message || t("settings.passwordsDoNotMatch"));
        } else {
          setError(err.message || t("settings.saveFailed"));
        }
      } else {
        setError(err.message || t("settings.saveFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>{t("settings.changePasswordTitle")}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {t("settings.changePasswordDesc")}
        </Dialog.Description>

        <Flex direction="column" gap="3">
          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: [0, -5, 5, -5, 5, 0] }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <Callout.Root color="red">
                  <Callout.Icon>
                    <Icon icon="lucide:alert-circle" />
                  </Callout.Icon>
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              </motion.div>
            )}
          </AnimatePresence>

          <FormItem label={t("settings.currentPassword")} required>
            <TextField.Root
              type={showOldPassword ? "text" : "password"}
              placeholder={t("settings.enterCurrentPassword")}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            >
              <TextField.Slot side="right">
                <Icon
                  icon={showOldPassword ? "lucide:eye-off" : "lucide:eye"}
                  style={{ cursor: "pointer" }}
                  onClick={() => setShowOldPassword(!showOldPassword)}
                />
              </TextField.Slot>
            </TextField.Root>
          </FormItem>

          <FormItem label={t("settings.newPassword")} required>
            <TextField.Root
              type={showNewPassword ? "text" : "password"}
              placeholder={t("settings.enterNewPassword")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            >
              <TextField.Slot side="right">
                <Icon
                  icon={showNewPassword ? "lucide:eye-off" : "lucide:eye"}
                  style={{ cursor: "pointer" }}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                />
              </TextField.Slot>
            </TextField.Root>
          </FormItem>

          <FormItem label={t("settings.confirmNewPassword")} required>
            <TextField.Root
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("settings.confirmNewPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            >
              <TextField.Slot side="right">
                <Icon
                  icon={showConfirmPassword ? "lucide:eye-off" : "lucide:eye"}
                  style={{ cursor: "pointer" }}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              </TextField.Slot>
            </TextField.Root>
          </FormItem>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              {t("common.cancel")}
            </Button>
          </Dialog.Close>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("settings.updating") : t("settings.updatePassword")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
