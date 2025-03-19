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
  });
});