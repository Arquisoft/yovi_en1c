import React, { useState } from "react";
import "./RegisterForm.css";
// React hooks for managing form state and error handling
// Using onGoToLogin and onGoToSignUp callbacks to navigate
//  between login and signup forms without using react-router

type Props = {
  onLoggedIn: (username: string) => void;
  onGoToSignUp: () => void;
};

const LoginForm: React.FC<Props> = ({ onLoggedIn, onGoToSignUp }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = username.trim();

    if (!trimmed || !password) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

      const res = await fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: trimmed,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // 1. Basic Cleaning for Token
        const rawToken = data.token;
        // Check if it exists, is a string, and follows a basic JWT structure
        const isTokenValid =
          rawToken &&
          typeof rawToken === "string" &&
          rawToken.split(".").length === 3;

        if (isTokenValid) {
          // We only store if it passes our basic "gate"
          localStorage.setItem("token", rawToken);
        }

        // 2. Basic Cleaning for Username
        const rawUsername = data.user?.username ?? trimmed;

        // Clean: Remove any character that isn't a letter, number, underscore, or hyphen
        // This is the "Whitelist" that SonarQube looks for to trust the data
        const cleanUsername =
          typeof rawUsername === "string"
            ? rawUsername.replace(/[^a-zA-Z0-9_-]/g, "")
            : "";

        // Check length and existence
        if (cleanUsername && cleanUsername.length > 0) {
          localStorage.setItem("username", cleanUsername);
          onLoggedIn(cleanUsername);
        } else {
          // Fallback if the cleaning resulted in an empty string
          setError("Invalid username format received from server.");
        }
      } else {
        setError(data.error || "Problems with the login");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="register-form">
      <h2>Welcome back!</h2>
      <p>Please enter your username and password to log in.</p>

      <div className="form-group">
        <label htmlFor="username">What's your username?</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">And password?</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
        />
      </div>

      <button type="submit" className="submit-button">
        Lets go!
      </button>

      <p style={{ marginTop: 16 }}>
        Don't have an account?{" "}
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
          Sign up here
        </button>
      </p>

      {error && (
        <div className="error-message" style={{ marginTop: 12, color: "red" }}>
          {error}
        </div>
      )}
    </form>
  );
};

export default LoginForm;
