import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useSystemStore } from "../../stores/systemStore";
import { apiPost } from "../../lib/api";

export function useSetup() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { checkInitialized } = useSystemStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [language, setLanguage] = useState<"en" | "zh">(
    (localStorage.getItem("language") as "en" | "zh") || "en"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkInitialized()
      .then((initialized) => {
        if (initialized) {
          navigate("/", { replace: true });
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
  }, []);

  const handleLanguageChange = async (lang: "en" | "zh") => {
    setLanguage(lang);
    await i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const validateForm = () => {
    if (!email || !password || !confirmPassword) {
      setError(t("setup.error.allFieldsRequired", "All fields are required"));
      return false;
    }

    if (password.length < 8) {
      setError(t("setup.error.passwordTooShort", "Password must be at least 8 characters"));
      return false;
    }

    if (password !== confirmPassword) {
      setError(t("setup.error.passwordMismatch", "Passwords do not match"));
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t("setup.error.invalidEmail", "Invalid email address"));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Call backend API to initialize system (creates admin user and settings in transaction)
      const response = await apiPost("/api/system/initialize", {
        email: email,
        password: password,
        language: language,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize system");
      }

      console.log("System initialized:", data);

      toast.success(t("setup.success", "System initialized successfully! Please login."));

      // Redirect to login page
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err: any) {
      console.error("Setup error:", err);
      setError(
        err.message ||
          t("setup.error.setupFailed", "Failed to initialize system. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    language,
    handleLanguageChange,
    loading,
    error,
    handleSubmit,
    checking,
  };
}
