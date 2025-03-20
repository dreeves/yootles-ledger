import { describe, it, expect } from 'vitest';
import { LedgerProcessor } from './processor/LedgerProcessor';

describe('Ledger Parser', () => {
	const processor = new LedgerProcessor();

	describe('parseAccount', () => {
		it('should parse valid account entries', () => {
			const result = processor.parseAccount('account[alice, "Alice Smith", "alice@example.com"]');
			expect(result).toEqual({
				id: 'alice',
				name: 'Alice Smith',
				email: 'alice@example.com'
			});
		});

		it('should return null for invalid account entries', () => {
			expect(processor.parseAccount('not an account')).toBeNull();
			expect(processor.parseAccount('account[incomplete')).toBeNull();
		});

		it('should handle whitespace variations', () => {
			const result = processor.parseAccount(
				'account[  bob  ,  "Bob Jones"  ,  "bob@example.com"  ]'
			);
			expect(result).toEqual({
				id: 'bob',
				name: 'Bob Jones',
				email: 'bob@example.com'
			});
		});

		it('should handle accounts without email', () => {
			const result = processor.parseAccount('account[ppd, "Pine Peak Digital"]');
			expect(result).toEqual({
				id: 'ppd',
				name: 'Pine Peak Digital',
				email: ''
			});
		});
	});

	describe('parseTransaction', () => {
		it('should parse valid transaction entries', () => {
			const result = processor.parseTransaction('iou[2024.03.19, 50.25, alice, bob, "Lunch"]');
			expect(result).toEqual({
				date: '2024.03.19',
				amount: 50.25,
				from: 'alice',
				to: 'bob',
				description: 'Lunch'
			});
		});

		it('should return null for invalid transaction entries', () => {
			expect(processor.parseTransaction('not a transaction')).toBeNull();
			expect(processor.parseTransaction('iou[incomplete')).toBeNull();
		});

		it('should handle decimal amounts correctly', () => {
			const result = processor.parseTransaction(
				'iou[2024.03.19, 1234.56, alice, bob, "Big payment"]'
			);
			expect(result?.amount).toBe(1234.56);
		});

		it('should handle descriptions with spaces', () => {
			const result = processor.parseTransaction(
				'iou[2024.03.19, 10, alice, bob, "Lunch at the cafe"]'
			);
			expect(result?.description).toBe('Lunch at the cafe');
		});

		it('should handle whitespace variations', () => {
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
	});

	describe('parseInterestRate', () => {
		it('should parse valid interest rate entries', () => {
			const result = processor.parseInterestRate('irate[2024.03.19, 0.05]');
			expect(result).toEqual({
				date: '2024.03.19',
				rate: 0.05
			});
		});

		it('should return null for invalid interest rate entries', () => {
			expect(processor.parseInterestRate('not an interest rate')).toBeNull();
			expect(processor.parseInterestRate('irate[incomplete')).toBeNull();
		});

		it('should handle zero interest rates', () => {
			const result = processor.parseInterestRate('irate[2024.03.19, 0.00]');
			expect(result?.rate).toBe(0);
		});

		it('should handle high interest rates', () => {
			const result = processor.parseInterestRate('irate[2024.03.19, 0.99]');
			expect(result?.rate).toBe(0.99);
		});

		it('should handle whitespace variations', () => {
			const result = processor.parseInterestRate('irate[  2024.03.19  ,  0.05  ]');
			expect(result).toEqual({
				date: '2024.03.19',
				rate: 0.05
			});
		});
	});
});
