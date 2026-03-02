import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

let initialLanguage = "en";
try {
  const userLang = localStorage.getItem("user-language");
  if (userLang === "en" || userLang === "zh") {
    initialLanguage = userLang;
  }
} catch {}

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en,
    },
    zh: {
      translation: zh,
    },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
