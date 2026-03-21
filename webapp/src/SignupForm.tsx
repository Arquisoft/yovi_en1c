import React, { useState } from 'react';

// Using onGoToLogin callback to navigate
//  between login and signup forms without using react-router

type Props = {
    onRegistered: (username: string) => void;
    onGoToLogin: () => void;
};

// React hooks for managing form state and error handling

const SignUpForm: React.FC<Props> = ({ onRegistered, onGoToLogin }) => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        // Trim inputs to remove whitespaces or accurate login credentials
        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim();

        if (!trimmedUsername || !trimmedEmail || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

            const res = await fetch(`${API_URL}/users/createuser`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: trimmedUsername,
                    email: trimmedEmail,
                    password,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                onRegistered(trimmedUsername);
            } else setError(data.error || "Sign up error");
        } catch (err: any) {
            setError(err.message || "Network error");
        }
    };

    // JSX Form like with the original register page but with additional fields for email and password confirmation, 
    // and error handling for empty fields and password mismatch

    return (
        <form onSubmit={handleSubmit} className="signup-form">
            <h2>Sign Up</h2>
            <p>Please fill this form to create an account.</p>

            <div className="form-group">
                <label htmlFor="signup-username">Username</label>
                <input
                    type="text"
                    id="signup-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="signup-email">Email</label>
                <input
                    type="email"
                    id="signup-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="signup-password">Password</label>
                <input
                    type="password"
                    id="signup-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="signup-confirm-password">Confirm Password</label>
                <input
                    type="password"
                    id="signup-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                />
            </div>

            <button type="submit" className="submit-button">
                Sign Up
            </button>

            <p style={{ marginTop: 16 }}>
                Already have an account?{" "}
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
                    Log in here
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

export default SignUpForm;