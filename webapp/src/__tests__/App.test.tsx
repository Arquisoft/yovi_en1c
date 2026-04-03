import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import "@testing-library/jest-dom";

// We mock the child components to simplify the App test
// and focus strictly on the App's navigation logic.
vi.mock("../LoginForm", () => ({
  default: ({
    onLoggedIn,
    onGoToSignUp,
  }: {
    onLoggedIn: (name: string) => void;
    onGoToSignUp: () => void;
  }) => (
    <div>
      <h1>Login screen</h1>
      <button onClick={() => onLoggedIn("Pablo")}>Mock Login</button>
      <button onClick={onGoToSignUp}>Go to Sign Up</button>
    </div>
  ),
}));

vi.mock("../SignUpForm", () => ({
  default: ({
    onRegistered,
    onGoToLogin,
  }: {
    onRegistered: (name: string) => void;
    onGoToLogin: () => void;
  }) => (
    <div>
      <h1>Sign Up Screen</h1>
      <button onClick={() => onRegistered("Pablo")}>Mock Sign Up</button>
      <button onClick={onGoToLogin}>Back To Login</button>
    </div>
  ),
}));

vi.mock("../GameMenu", () => ({
  default: ({ userName, onStartGame, onLogOut }: any) => (
    <div>
      <h1>Menu Screen</h1>
      <p>User: {userName}</p>
      <button onClick={() => onStartGame({})}>Start Game</button>
      <button onClick={onLogOut}>Log Out</button>
    </div>
  ),
}));

vi.mock("../GameBoard", () => ({
  default: ({ onBack }: { onBack: () => void }) => (
    <div>
      <h1>Board Screen</h1>
      <button onClick={onBack}>Back to Menu</button>
    </div>
  ),
}));

describe("App Navigation Flow", () => {
  it("should follow the full flow: Login -> Menu -> Board -> Menu -> Logout", async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Initial State: Login Screen
    expect(screen.getByText(/Welcome to the Software/i)).toBeInTheDocument();
    expect(screen.getByText("Login Screen")).toBeInTheDocument();

    // 2. Action: Register
    await user.click(screen.getByText("Mock Login"));

    // 3. Result: Menu Screen
    expect(screen.getByText("Menu Screen")).toBeInTheDocument();
    expect(screen.getByText("User: Pablo")).toBeInTheDocument();

    // 4. Action: Start Game
    await user.click(screen.getByText("Start Game"));

    // 5. Result: Board Screen
    expect(screen.getByText("Board Screen")).toBeInTheDocument();

    // 6. Action: Go Back
    await user.click(screen.getByText("Back to Menu"));

    // 7. Result: Back in Menu
    expect(screen.getByText("Menu Screen")).toBeInTheDocument();

    // 8. Action: Log Out
    await user.click(screen.getByText("Log Out"));

    // 9. Result: Back to Register Screen
    expect(screen.getByText(/Welcome to the Software/i)).toBeInTheDocument();
    expect(screen.getByText("Login Screen")).toBeInTheDocument();
  });
  it("should navigate from Login to Sign Up and back to Login", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText("Login Screen")).toBeInTheDocument();

    await user.click(screen.getByText("Go To Sign Up"));
    expect(screen.getByText("Sign Up Screen")).toBeInTheDocument();

    await user.click(screen.getByText("Back To Login"));
    expect(screen.getByText("Login Screen")).toBeInTheDocument();
  });

  it("should navigate from Sign Up to Menu after registration", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Go To Sign Up"));
    expect(screen.getByText("Sign Up Screen")).toBeInTheDocument();

    await user.click(screen.getByText("Mock Sign Up"));

    expect(screen.getByText("Menu Screen")).toBeInTheDocument();
    expect(screen.getByText("User: Pablo")).toBeInTheDocument();
  });
});
