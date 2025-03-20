import { describe, it, expect } from 'vitest';
import { LedgerProcessor } from './LedgerProcessor';

describe('LedgerProcessor', () => {
  const processor = new LedgerProcessor();

  describe('parseAccount', () => {
    it('should parse account with email', () => {
      const result = processor.parseAccount('account[alice, "Alice Smith", "alice@example.com"]');
      expect(result).toEqual({
        id: 'alice',
        name: 'Alice Smith',
        email: 'alice@example.com'
      });
    });

    it('should parse account without email', () => {
      const result = processor.parseAccount('account[bob, "Bob Jones"]');
      expect(result).toEqual({
        id: 'bob',
        name: 'Bob Jones',
        email: ''
      });
    });

    it('should handle whitespace', () => {
      const result = processor.parseAccount('  account[  bob  ,  "Bob Jones"  ]  ');
      expect(result).toEqual({
        id: 'bob',
        name: 'Bob Jones',
        email: ''
      });
    });
  });

  describe('parseTransaction', () => {
    it('should parse transaction', () => {
      const result = processor.parseTransaction('iou[50.25, alice, bob, 2024.03.19, "Lunch"]');
      expect(result).toEqual({
        amount: 50.25,
        from: 'alice',
        to: 'bob',
        date: '2024.03.19',
        description: 'Lunch'
      });
    });

    it('should handle whitespace', () => {
      const result = processor.parseTransaction('  iou[  50  ,  alice  ,  bob  ,  2024.03.19  ,  "Payment"  ]  ');
      expect(result).toEqual({
        amount: 50,
        from: 'alice',
        to: 'bob',
        date: '2024.03.19',
        description: 'Payment'
      });
    });
  });

  describe('parseInterestRate', () => {
    it('should parse equals format', () => {
      const result = processor.parseInterestRate('irate[2024.03.19] = .05;');
      expect(result).toEqual({
        date: '2024.03.19',
        rate: 0.05
      });
    });

    it('should parse comma format', () => {
      const result = processor.parseInterestRate('irate[2024.03.19, 0.05]');
      expect(result).toEqual({
        date: '2024.03.19',
        rate: 0.05
      });
    });

    it('should handle whitespace', () => {
      const result = processor.parseInterestRate('  irate[  2024.03.19  ]  =  .05  ;  ');
      expect(result).toEqual({
        date: '2024.03.19',
        rate: 0.05
      });
    });
  });

  describe('processLedger', () => {
    it('should process a complete ledger', () => {
      const content = `
account[alice, "Alice", "alice@example.com"]
account[bob, "Bob", "bob@example.com"]

irate[2024.01.01] = .05;

iou[100, alice, bob, 2024.01.15, "Lunch"]
iou[50, bob, alice, 2024.02.15, "Gas"]

[MAGIC_LEDGER_END]
`;
      const result = processor.processLedger(content);
      
      expect(result.accounts).toHaveLength(2);
      expect(result.transactions).toHaveLength(2);
      expect(result.interestRates).toHaveLength(1);
      
      // Check balances with interest
      const alice = result.accounts.find(a => a.id === 'alice');
      const bob = result.accounts.find(a => a.id === 'bob');
      
      expect(alice).toBeDefined();
      expect(bob).toBeDefined();
      expect(alice!.balance + bob!.balance).toBeCloseTo(0, 2); // Total should be zero
    });
  });
});