import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fi from "./locales/fi.json";
import tr from "./locales/tr.json";
import as from "./locales/ast.json";

i18n
  .use(LanguageDetector) // auto-detect browser language
  .use(initReactI18next) // bind to React
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fi: { translation: fi },
      tr: { translation: tr },
      as: { translation: as },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "es", "fi", "tr", "as"],
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
