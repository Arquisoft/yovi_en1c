import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const LANGUAGES = [
    { code: "en", label: "ENG" },
    { code: "es", label: "ESP" },
    { code: "fi", label: "FIN" },
    { code: "tr", label: "TUR" },
    { code: "as", label: "AST" },
  ];

  return (
    <div className="language-container">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`lang-button ${i18n.language.startsWith(lang.code) ? "active" : ""}`}
        >
          <span className="lang-label">{lang.label}</span>
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
