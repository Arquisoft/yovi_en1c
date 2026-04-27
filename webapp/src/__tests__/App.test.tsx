import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import "@testing-library/jest-dom";

vi.mock("../RegisterForm", () => ({
  default: ({ onLoggedIn, onGoToSignUp }: any) => (
    <div>
      <h1>Login Screen</h1>
      <button onClick={() => onLoggedIn("Pablo")}>Mock Login</button>
      <button onClick={onGoToSignUp}>Go to Sign Up</button>
    </div>
  ),
}));

vi.mock("../SignupForm", () => ({
  default: ({ onRegistered, onGoToLogin }: any) => (
    <div>
      <h1>Signup Screen</h1>
      <button onClick={() => onRegistered("Pablo")}>Mock Sign Up</button>
      <button onClick={onGoToLogin}>Go to Login</button>
    </div>
  ),
}));

vi.mock("../GameMenu", () => ({
  default: ({ userName, onStartGame, onLogOut, onViewHistory }: any) => (
    <div>
      <h1>Menu Screen</h1>
      <p>User: {userName}</p>
      <button
        onClick={() =>
          onStartGame({
            boardSize: "small",
            mode: "standard",
            difficulty: "random",
            layout: "classic",
          })
        }
      >
        Start Game
      </button>
      <button onClick={onLogOut}>Log Out</button>
      <button onClick={onViewHistory}>View History</button>
    </div>
  ),
}));

vi.mock("../GameBoard", () => ({
  default: ({ onBack, userName }: any) => (
    <div>
      <h1>Board Screen</h1>
      <p>Playing as: {userName}</p>
      <button onClick={onBack}>Back to Menu</button>
    </div>
  ),
}));

vi.mock("../GameHistory", () => ({
  default: ({ onBack, userName }: any) => (
    <div>
      <h1>History Screen</h1>
      <p>History for: {userName}</p>
      <button onClick={onBack}>Back to Menu</button>
    </div>
  ),
}));

describe("App Navigation Flow", () => {
  it("shows login screen on initial render", () => {
    render(<App />);

    expect(screen.getByText(/Welcome to the Y game!/i)).toBeInTheDocument();
    expect(screen.getByText("Login Screen")).toBeInTheDocument();
  });

  it("navigates from login to menu after logging in", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Mock Login"));

    expect(screen.getByText("Menu Screen")).toBeInTheDocument();
    expect(screen.getByText("User: Pablo")).toBeInTheDocument();
  });

  it("navigates from login to signup screen", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Go to Sign Up"));

    expect(screen.getByText("Signup Screen")).toBeInTheDocument();
  });

  it("navigates from signup back to login", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Go to Sign Up"));
    expect(screen.getByText("Signup Screen")).toBeInTheDocument();

    await user.click(screen.getByText("Go to Login"));
    expect(screen.getByText("Login Screen")).toBeInTheDocument();
  });

  it("navigates from signup to menu after registering", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Go to Sign Up"));
    await user.click(screen.getByText("Mock Sign Up"));

    expect(screen.getByText("Menu Screen")).toBeInTheDocument();
    expect(screen.getByText("User: Pablo")).toBeInTheDocument();
  });

  it("full flow: Login -> Menu -> Board -> Menu -> Logout", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Mock Login"));
    expect(screen.getByText("Menu Screen")).toBeInTheDocument();

    await user.click(screen.getByText("Start Game"));
    expect(screen.getByText("Board Screen")).toBeInTheDocument();
    expect(screen.getByText("Playing as: Pablo")).toBeInTheDocument();

    await user.click(screen.getByText("Back to Menu"));
    expect(screen.getByText("Menu Screen")).toBeInTheDocument();

    await user.click(screen.getByText("Log Out"));
    expect(screen.getByText("Login Screen")).toBeInTheDocument();
  });

  it("navigates from menu to history and back", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Mock Login"));
    expect(screen.getByText("Menu Screen")).toBeInTheDocument();

    await user.click(screen.getByText("View History"));
    expect(screen.getByText("History Screen")).toBeInTheDocument();
    expect(screen.getByText("History for: Pablo")).toBeInTheDocument();

    await user.click(screen.getByText("Back to Menu"));
    expect(screen.getByText("Menu Screen")).toBeInTheDocument();
  });

  it("clears username and config after logout", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Mock Login"));
    await user.click(screen.getByText("Log Out"));

    // Back to login, no username shown
    expect(screen.getByText("Login Screen")).toBeInTheDocument();
    expect(screen.queryByText("User: Pablo")).not.toBeInTheDocument();
  });
});
