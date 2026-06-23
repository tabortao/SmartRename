import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

// Get saved language from localStorage, fall back to navigator language
const getSavedLanguage = (): string => {
  try {
    const saved = localStorage.getItem("i18nextLng");
    if (saved === "en" || saved === "zh") {
      return saved;
    }
  } catch {
    // localStorage unavailable
  }
  // Detect from browser
  const navLang = navigator.language?.toLowerCase();
  if (navLang?.startsWith("zh")) return "zh";
  return "en";
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: getSavedLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Persist language changes to localStorage
i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem("i18nextLng", lng);
  } catch {
    // localStorage unavailable
  }
});

export default i18n;
