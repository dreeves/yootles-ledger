import { describe, it, expect } from 'vitest';
import * as ledger from './ledger';

describe('Ledger Parser', () => {
  describe('parseAccount', () => {
    it('should parse valid account entries', () => {
      const result = ledger.parseAccount('account[alice, "Alice Smith", "alice@example.com"]');
      expect(result).toEqual({
        id: 'alice',
        name: 'Alice Smith',
        email: 'alice@example.com'
      });
    });

    it('should return null for invalid account entries', () => {
      expect(ledger.parseAccount('not an account')).toBeNull();
      expect(ledger.parseAccount('account[incomplete')).toBeNull();
    });

    it('should handle whitespace variations', () => {
      const result = ledger.parseAccount('account[  bob  ,  "Bob Jones"  ,  "bob@example.com"  ]');
      expect(result).toEqual({
        id: 'bob',
        name: 'Bob Jones',
        email: 'bob@example.com'
      });
    });

    it('should handle accounts without email', () => {
      const result = ledger.parseAccount('account[ppd, "Pine Peak Digital"]');
      expect(result).toEqual({
        id: 'ppd',
        name: 'Pine Peak Digital',
        email: ''
      });
    });
  });

  describe('parseTransaction', () => {
    it('should parse valid transaction entries', () => {
      const result = ledger.parseTransaction('iou[2024.03.19, 50.25, alice, bob, "Lunch"]');
      expect(result).toEqual({
        date: '2024.03.19',
        amount: 50.25,
        from: 'alice',
        to: 'bob',
        description: 'Lunch'
      });
    });

    it('should return null for invalid transaction entries', () => {
      expect(ledger.parseTransaction('not a transaction')).toBeNull();
      expect(ledger.parseTransaction('iou[incomplete')).toBeNull();
    });

    it('should handle decimal amounts correctly', () => {
      const result = ledger.parseTransaction('iou[2024.03.19, 1234.56, alice, bob, "Big payment"]');
      expect(result?.amount).toBe(1234.56);
    });

    it('should handle descriptions with spaces', () => {
      const result = ledger.parseTransaction('iou[2024.03.19, 10, alice, bob, "Lunch at the cafe"]');
      expect(result?.description).toBe('Lunch at the cafe');
    });

    it('should handle whitespace variations', () => {
      const result = ledger.parseTransaction('iou[  2024.03.19  ,  50  ,  alice  ,  bob  ,  "Payment"  ]');
      expect(result).toEqual({
        date: '2024.03.19',
        amount: 50,
        from: 'alice',
        to: 'bob',
        description: 'Payment'
      });
    });
  });

  describe('parseInterestRate', () => {
    it('should parse valid interest rate entries', () => {
      const result = ledger.parseInterestRate('irate[2024.03.19, 0.05]');
      expect(result).toEqual({
        date: '2024.03.19',
        rate: 0.05
      });
    });

    it('should return null for invalid interest rate entries', () => {
      expect(ledger.parseInterestRate('not an interest rate')).toBeNull();
      expect(ledger.parseInterestRate('irate[incomplete')).toBeNull();
    });

    it('should handle zero interest rates', () => {
      const result = ledger.parseInterestRate('irate[2024.03.19, 0.00]');
      expect(result?.rate).toBe(0);
    });

    it('should handle high interest rates', () => {
      const result = ledger.parseInterestRate('irate[2024.03.19, 0.99]');
      expect(result?.rate).toBe(0.99);
    });

    it('should handle whitespace variations', () => {
      const result = ledger.parseInterestRate('irate[  2024.03.19  ,  0.05  ]');
      expect(result).toEqual({
        date: '2024.03.19',
        rate: 0.05
      });
    });
  });
});