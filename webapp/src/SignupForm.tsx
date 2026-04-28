import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./SignupForm.css";
import { sanitizeToken, sanitizeUsername } from "./sanitize";

type Props = {
  onRegistered: (username: string) => void;
  onGoToLogin: () => void;
};

const processSignupResponse = (data: Record<string, unknown>): void => {
  const token = data?.token;
  const usernameFromBackend = (data?.user as Record<string, unknown>)?.username;
  if (token && usernameFromBackend) {
    const cleanToken = sanitizeToken(token);
    const cleanUsername = sanitizeUsername(usernameFromBackend);
    localStorage.setItem("token", cleanToken);
    localStorage.setItem("username", cleanUsername);
  }
};

const SignUpForm: React.FC<Props> = ({ onRegistered, onGoToLogin }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): string | null => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      return t("signup.error_empty_fields");
    }
    if (password !== confirmPassword) {
      return t("signup.error_password_mismatch");
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${API_URL}/api/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });

      const text = await res.text();
      const data = JSON.parse(text);

      if (!res.ok) {
        setError(data.error || t("signup.error_generic"));
        return;
      }

      processSignupResponse(data);
      onRegistered(username.trim());
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        setError(t("signup.error_server_response"));
      } else {
        setError(
          err instanceof Error ? err.message : t("common.network_error"),
        );
      }
    }
  };

  return (
    <div className="signup-form-container">
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
            className="link-button"
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
          <div
            className="error-message"
            style={{ marginTop: 12, color: "red" }}
          >
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default SignUpForm;
