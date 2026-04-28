import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LanguageSwitcher from "../LanguageSwitcher";
import "@testing-library/jest-dom";

const mockChangeLanguage = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: {
      changeLanguage: mockChangeLanguage,
      resolvedLanguage: "en",
      language: "en", // Required for .startsWith() if used
    },
  }),
  // Fixes the "initReactI18next" export error
  initReactI18next: {
    type: "3rdParty",
    init: vi.fn(),
  },
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const allLanguages = [
    { code: "en", label: "ENG" },
    { code: "es", label: "ESP" },
    { code: "fi", label: "FIN" },
    { code: "tr", label: "TUR" },
    { code: "as", label: "AST" },
  ];

  it("should render all language buttons", () => {
    render(<LanguageSwitcher />);
    allLanguages.forEach((lang) => {
      expect(
        screen.getByRole("button", { name: lang.label }),
      ).toBeInTheDocument();
    });
  });

  it("should call changeLanguage when clicked", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "AST" }));
    expect(mockChangeLanguage).toHaveBeenCalledWith("as");
  });
});
