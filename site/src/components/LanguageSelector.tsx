import { Select } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../contexts/LanguageContext";

export default function LanguageSelector() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <Select.Root value={language} onValueChange={(value) => setLanguage(value as "en" | "zh")}>
      <Select.Trigger />
      <Select.Content>
        <Select.Item value="en">{t("language.en")}</Select.Item>
        <Select.Item value="zh">{t("language.zh")}</Select.Item>
      </Select.Content>
    </Select.Root>
  );
}
