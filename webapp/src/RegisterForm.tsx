import React, { useState } from "react";

type Props = {
  onRegistered: (username: string) => void;
};

const RegisterForm: React.FC<Props> = ({ onRegistered }) => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  //const mock_mode = true;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = username.trim();

    if (!trimmed) {
      setError("Please enter a username.");
      return;
    }

    /*
    if (mock_mode) {
      onRegistered(trimmed);
      return;
    }
    */

    try {
      const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${API_URL}/users/createuser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: trimmed }),
      });

      const data = await res.json();

      if (res.ok) onRegistered(trimmed);
      else setError(data.error || "Server error");
    } catch (err: any) {
      setError(err.message || "Network error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="register-form">
      <div className="form-group">
        <label htmlFor="username">Whats your name?</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="form-input"
        />
      </div>

      <button type="submit" className="submit-button">
        Lets go!
      </button>

      {error && (
        <div className="error-message" style={{ marginTop: 12, color: "red" }}>
          {error}
        </div>
      )}
    </form>
  );
};

export default RegisterForm;
