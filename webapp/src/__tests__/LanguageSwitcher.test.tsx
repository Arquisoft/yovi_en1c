import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LanguageSwitcher from "../LanguageSwitcher";
import "@testing-library/jest-dom";

const mockChangeLanguage = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: {
      changeLanguage: mockChangeLanguage,
      resolvedLanguage: "en",
    },
  }),
}));

describe("LanguageSwitcher ", () => {
  it("should render all language buttons and the label", () => {
    render(<LanguageSwitcher />);

    expect(screen.getByText("language_switcher.label:")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "ENG" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ESP" })).toBeInTheDocument();
  });

  it("should call changeLanguage when a language button is clicked", () => {
    render(<LanguageSwitcher />);

    const esButton = screen.getByRole("button", { name: "ESP" });

    fireEvent.click(esButton);

    expect(mockChangeLanguage).toHaveBeenCalledWith("es");
  });

  it("should apply different styles to the active language", () => {
    render(<LanguageSwitcher />);

    const enButton = screen.getByRole("button", { name: "ENG" });
    const esButton = screen.getByRole("button", { name: "ESP" });

    expect(enButton.style.background).toBe("rgb(79, 70, 229)");
    expect(esButton.style.background).toBe("transparent");
  });
});
