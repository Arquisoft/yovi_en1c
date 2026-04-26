import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LanguageSwitcher from "../LanguageSwitcher";
import "@testing-library/jest-dom";

const mockChangeLanguage = vi.fn();

let mockLanguage = "en";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: mockChangeLanguage,
      resolvedLanguage: mockLanguage,
    },
  }),
}));

describe("LanguageSwitcher", () => {
  it("should render all four language buttons and the label", () => {
    render(<LanguageSwitcher />);

    // Check for the label text
    expect(screen.getByText(/language_switcher.label/i)).toBeInTheDocument();

    // Check for all buttons
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ES" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "TR" })).toBeInTheDocument();
  });

  it("should call changeLanguage when a language button is clicked", () => {
    render(<LanguageSwitcher />);

    const trButton = screen.getByRole("button", { name: "TR" });
    fireEvent.click(trButton);

    expect(mockChangeLanguage).toHaveBeenCalledWith("tr");
  });

  it("should apply active styles to the current language", () => {
    render(<LanguageSwitcher />);

    const enButton = screen.getByRole("button", { name: "EN" });
    const esButton = screen.getByRole("button", { name: "ES" });

    // Matches the inline styles in your provided component
    expect(enButton.style.background).toBe("rgb(79, 70, 229)"); // #4f46e5
    expect(esButton.style.background).toBe("transparent");
  });

  it('should call changeLanguage with "fi" when Finnish button is clicked', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "FI" }));
    expect(mockChangeLanguage).toHaveBeenCalledWith("fi");
  });

  it('should apply active styles to EN when resolvedLanguage is "en"', () => {
    mockLanguage = "en";
    render(<LanguageSwitcher />);
    const enButton = screen.getByRole("button", { name: "EN" });
    const esButton = screen.getByRole("button", { name: "ES" });

    expect(enButton.style.background).toBe("rgb(79, 70, 229)");
    expect(enButton.style.color).toBe("rgb(255, 255, 255)");
    expect(esButton.style.background).toBe("transparent");
  });

  it('should switch active styles when resolvedLanguage changes to "tr"', () => {
    mockLanguage = "tr";
    render(<LanguageSwitcher />);
    const trButton = screen.getByRole("button", { name: "TR" });
    const enButton = screen.getByRole("button", { name: "EN" });

    expect(trButton.style.background).toBe("rgb(79, 70, 229)");
    expect(enButton.style.background).toBe("transparent");
  });

  it('should have type="button" on all buttons to prevent form submission', () => {
    render(<LanguageSwitcher />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("type", "button");
    });
  });
});
