import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LanguageSwitcher from './LanguageSwitcher';

// Mock i18next with a spy for the changeLanguage function
const mockChangeLanguage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: {
      changeLanguage: mockChangeLanguage,
      resolvedLanguage: 'en', // Force initial state to English
    },
  }),
}));

describe('LanguageSwitcher Coverage 100%', () => {
  it('should render all language buttons and the label', () => {
    render(<LanguageSwitcher />);
    
    // Verify label is translated and displayed
    expect(screen.getByText('language_switcher.label:')).toBeInTheDocument();
    
    // Verify both buttons exist (EN and ES)
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ES' })).toBeInTheDocument();
  });

  it('should call changeLanguage when a language button is clicked', () => {
    render(<LanguageSwitcher />);
    
    const esButton = screen.getByRole('button', { name: 'ES' });
    
    // Simulate click
    fireEvent.click(esButton);
    
    // Verify the library function was called with the correct code
    expect(mockChangeLanguage).toHaveBeenCalledWith('es');
  });

  it('should apply different styles to the active language', () => {
    render(<LanguageSwitcher />);
    
    const enButton = screen.getByRole('button', { name: 'EN' });
    const esButton = screen.getByRole('button', { name: 'ES' });

    // In our mock, resolvedLanguage is 'en'
    // Check that EN button is active (background color) and ES is transparent
    expect(enButton.style.background).toBe('rgb(79, 70, 229)'); // Hex #4f46e5
    expect(esButton.style.background).toBe('transparent');
  });
});