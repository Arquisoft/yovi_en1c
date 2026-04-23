import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./RegisterForm.css";

type Props = {
  onLoggedIn: (username: string) => void;
  onGoToSignUp: () => void;
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
      {["en", "es"].map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => i18n.changeLanguage(lang)}
          style={{
            fontWeight: i18n.language.startsWith(lang) ? "bold" : "normal",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          {lang === "en" ? "🇬🇧 EN" : "🇪🇸 ES"}
        </button>
      ))}
    </div>
  );
}

const LoginForm: React.FC<Props> = ({ onLoggedIn, onGoToSignUp }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = username.trim();
    if (!trimmed || !password) {
      setError(t("login.error_empty"));
      return;
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

      const res = await fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.token) localStorage.setItem("token", data.token);
        onLoggedIn(data.user?.username || trimmed);
      } else {
        setError(data.error || t("login.error_generic"));
      }
    } catch (err: any) {
      setError(t("common.error_network"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form-container">
      <LanguageSwitcher />
      
      <form onSubmit={handleSubmit} className="register-form">
        <h2>{t("login.title")}</h2>
        <p>{t("login.subtitle")}</p>

        <div className="form-group">
          <label htmlFor="username">{t("login.username_label")}</label>
          <input
            type="text"
            id="username"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">{t("login.password_label")}</label>
          <input
            type="password"
            id="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
          />
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? t("common.loading") : t("login.submit")}
        </button>

        <p style={{ marginTop: 16 }}>
          {t("login.no_account")}{" "}
          <button
            type="button"
            onClick={onGoToSignUp}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#4f46e5",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {t("login.go_signup")}
          </button>
        </p>

        {error && (
          <div className="error-message" style={{ marginTop: 12, color: "red" }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default LoginForm;