import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./SignupForm.css";

type Props = {
  onRegistered: (username: string) => void;
  onGoToLogin: () => void;
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {["en", "es"].map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => i18n.changeLanguage(lang)}
          style={{
            fontWeight: i18n.language === lang ? "bold" : "normal",
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

const SignUpForm: React.FC<Props> = ({ onRegistered, onGoToLogin }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || !trimmedEmail || !password || !confirmPassword) {
      setError(t("signup.error_empty"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("signup.error_password_mismatch"));
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

      const res = await fetch(`${API_URL}/api/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          email: trimmedEmail,
          password,
        }),
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Server returned non-JSON:", text);
        setError(t("common.error_unexpected"));
        return;
      }

      if (res.ok) {
        onRegistered(trimmedUsername);
      } else {
        setError(data.error || t("signup.error_generic"));
      }
    } catch (err: any) {
      setError(err.message || t("common.error_network"));
    }
  };

  return (
    <>
      <LanguageSwitcher />
      <form onSubmit={handleSubmit} className="signup-form">
        <h2>{t("signup.title")}</h2>
        <p>{t("signup.subtitle")}</p>

        <div className="form-group">
          <label htmlFor="signup-username">{t("signup.username_label")}</label>
          <input
            type="text"
            id="signup-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="signup-email">{t("signup.email_label")}</label>
          <input
            type="email"
            id="signup-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="signup-password">{t("signup.password_label")}</label>
          <input
            type="password"
            id="signup-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="signup-confirm-password">
            {t("signup.confirm_password_label")}
          </label>
          <input
            type="password"
            id="signup-confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="form-input"
          />
        </div>

        <button type="submit" className="submit-button">
          {t("signup.submit")}
        </button>

        <p style={{ marginTop: 16 }}>
          {t("signup.have_account")}{" "}
          <button
            type="button"
            onClick={onGoToLogin}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#4f46e5",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {t("signup.go_login")}
          </button>
        </p>

        {error && (
          <div className="error-message" style={{ marginTop: 12, color: "red" }}>
            {error}
          </div>
        )}
      </form>
    </>
  );
};

export default SignUpForm;