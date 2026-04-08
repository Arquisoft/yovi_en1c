import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import "@testing-library/jest-dom";

// We mock the child components to simplify the App test
// and focus strictly on the App's navigation logic.
vi.mock("../RegisterForm", () => ({
  default: ({ onRegistered }: { onRegistered: (name: string) => void }) => (
    <button onClick={() => onRegistered("Pablo")}>Mock Register</button>
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
  it("should follow the full flow: Register -> Menu -> Board -> Menu -> Logout", async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Initial State: Register Screen
    expect(screen.getByText(/Welcome to play the game of Y/i)).toBeInTheDocument();
    const registerBtn = screen.getByText("Mock Register");

    // 2. Action: Register
    await user.click(registerBtn);

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
  });
});
