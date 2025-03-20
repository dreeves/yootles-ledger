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
			const result = processor.parseAccount('account[ppd, "Pine Peak Digital"]');
			expect(result).toEqual({
				id: 'ppd',
				name: 'Pine Peak Digital',
				email: ''
			});
		});

		it('should handle whitespace', () => {
			const result = processor.parseAccount(
				'account[  bob  ,  "Bob Jones"  ,  "bob@example.com"  ]'
			);
			expect(result).toEqual({
				id: 'bob',
				name: 'Bob Jones',
				email: 'bob@example.com'
			});
		});
	});

	describe('parseTransaction', () => {
		it('should parse transaction', () => {
			const result = processor.parseTransaction('iou[2024.03.19, 50.25, alice, bob, "Lunch"]');
			expect(result).toEqual({
				date: '2024.03.19',
				amount: 50.25,
				from: 'alice',
				to: 'bob',
				description: 'Lunch'
			});
		});

		it('should handle whitespace', () => {
			const result = processor.parseTransaction(
				'iou[  2024.03.19  ,  50  ,  alice  ,  bob  ,  "Payment"  ]'
			);
			expect(result).toEqual({
				date: '2024.03.19',
				amount: 50,
				from: 'alice',
				to: 'bob',
				description: 'Payment'
			});
		});

		it('should handle expressions', () => {
			const result = processor.parseTransaction('iou[2024.03.19, 25/60*20, alice, bob, "Lunch"]');
			expect(result).toEqual({
				date: '2024.03.19',
				amount: (25 / 60) * 20,
				from: 'alice',
				to: 'bob',
				description: 'Lunch'
			});
		});

		it('should handle monthly transactions', () => {
			const result = processor.parseTransaction(
				'iouMonthly[2024.01.15, 2024.03.19, 750, alice, bob, "Monthly rent"]'
			);
			expect(result).toEqual({
				date: '2024.03.15',
				amount: 750,
				from: 'alice',
				to: 'bob',
				description: 'Monthly rent'
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
			const result = processor.parseInterestRate('irate[  2024.03.19  ,  0.05  ]');
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

iou[2024.01.15, 100, alice, bob, "Lunch"]
iou[2024.02.15, 50, bob, alice, "Gas"]

[MAGIC_LEDGER_END]
`;
			const result = processor.processLedger(content);

			expect(result.accounts).toHaveLength(2);
			expect(result.transactions).toHaveLength(2);
			expect(result.interestRates).toHaveLength(1);

			// Check balances with interest
			const alice = result.accounts.find((a) => a.id === 'alice');
			const bob = result.accounts.find((a) => a.id === 'bob');

			expect(alice).toBeDefined();
			expect(bob).toBeDefined();
			expect(alice!.balance + bob!.balance).toBeCloseTo(0, 2); // Total should be zero
		});
	});
});
