import { describe, it, expect } from 'vitest';
import { parseAccount, parseTransaction, parseInterestRate } from './ledger';

describe('Ledger Parser', () => {
  describe('parseAccount', () => {
    it('should parse valid account entries', () => {
      const result = parseAccount('account[alice, "Alice Smith", "alice@example.com"]');
      expect(result).toEqual({
        id: 'alice',
        name: 'Alice Smith',
        email: 'alice@example.com'
      });
    });

    it('should return null for invalid account entries', () => {
      expect(parseAccount('not an account')).toBeNull();
      expect(parseAccount('account[incomplete')).toBeNull();
    });

    it('should handle whitespace variations', () => {
      const result = parseAccount('account[  bob  ,  "Bob Jones"  ,  "bob@example.com"  ]');
      expect(result).toEqual({
        id: 'bob',
        name: 'Bob Jones',
        email: 'bob@example.com'
      });
    });
  });

  describe('parseTransaction', () => {
    it('should parse valid transaction entries', () => {
      const result = parseTransaction('iou[50.25, alice, bob, 2024.03.19, "Lunch"]');
      expect(result).toEqual({
        amount: 50.25,
        from: 'alice',
        to: 'bob',
        date: '2024.03.19',
        description: 'Lunch'
      });
    });

    it('should return null for invalid transaction entries', () => {
      expect(parseTransaction('not a transaction')).toBeNull();
      expect(parseTransaction('iou[incomplete')).toBeNull();
    });

    it('should handle decimal amounts correctly', () => {
      const result = parseTransaction('iou[1234.56, alice, bob, 2024.03.19, "Big payment"]');
      expect(result?.amount).toBe(1234.56);
    });

    it('should handle descriptions with spaces', () => {
      const result = parseTransaction('iou[10, alice, bob, 2024.03.19, "Lunch at the cafe"]');
      expect(result?.description).toBe('Lunch at the cafe');
    });
  });

  describe('parseInterestRate', () => {
    it('should parse valid interest rate entries', () => {
      const result = parseInterestRate('irate[2024.03.19, 0.05]');
      expect(result).toEqual({
        date: '2024.03.19',
        rate: 0.05
      });
    });

    it('should return null for invalid interest rate entries', () => {
      expect(parseInterestRate('not an interest rate')).toBeNull();
      expect(parseInterestRate('irate[incomplete')).toBeNull();
    });

    it('should handle zero interest rates', () => {
      const result = parseInterestRate('irate[2024.03.19, 0.00]');
      expect(result?.rate).toBe(0);
    });

    it('should handle high interest rates', () => {
      const result = parseInterestRate('irate[2024.03.19, 0.99]');
      expect(result?.rate).toBe(0.99);
    });
  });
});