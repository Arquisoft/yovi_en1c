import { describe, it, expect } from 'vitest';
import { sanitizeUsername, sanitizeToken } from '../sanitize';

describe('Sanitize Utils', () => {
  describe('sanitizeUsername', () => {
    it('should remove special characters and keep alphanumeric, underscores, and hyphens', () => {
      expect(sanitizeUsername('pablo<script>')).toBe('pabloscript');
      expect(sanitizeUsername('user!@#name123')).toBe('username123');
      expect(sanitizeUsername('test_user-2024')).toBe('test_user-2024');
    });

    it('should throw an error for null or undefined inputs', () => {

        expect(() => sanitizeUsername(null)).toThrow("Invalid username format.");
      expect(() => sanitizeUsername(undefined)).toThrow("Invalid username format.");
    });


   it('should handle numeric inputs by converting them to string', () => {
      expect(sanitizeUsername(12345)).toBe('12345');
    });

    it('should throw an error if the resulting username is empty after sanitization', () => {
      expect(() => sanitizeUsername('!!!')).toThrow("Invalid username format.");
    });
  });

  describe('sanitizeToken', () => {
    it('should return the token if it matches the JWT-like format (x.y.z)', () => {
      const validToken = 'abc123_-.def456.ghi789';
      expect(sanitizeToken(validToken)).toBe(validToken);
    });

    it('should throw an error if the token format is invalid', () => {
      expect(() => sanitizeToken('invalid-token-no-dots')).toThrow("Invalid token format received.");
      expect(() => sanitizeToken('one.dot')).toThrow("Invalid token format received.");
    });

    it('should throw an error for non-string or object inputs for tokens', () => {
      expect(() => sanitizeToken(undefined)).toThrow("Invalid token format received.");
      expect(() => sanitizeToken({ key: 'val' })).toThrow("Invalid token format received.");
    });
  });
});