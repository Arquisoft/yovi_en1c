import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "fi", label: "FI" },
  { code: "tr", label: "TR" },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>
        {t("language_switcher.label")}:
      </span>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => i18n.changeLanguage(lang.code)}
          style={{
            background:
              i18n.resolvedLanguage === lang.code ? "#4f46e5" : "transparent",
            color: i18n.resolvedLanguage === lang.code ? "#fff" : "#4f46e5",
            border: "1px solid #4f46e5",
            borderRadius: 4,
            padding: "2px 8px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
