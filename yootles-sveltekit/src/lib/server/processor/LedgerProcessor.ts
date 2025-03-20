import type { Account, Transaction, Ledger } from '$lib/types/ledger';

interface InterestRate {
	date: string;
	rate: number;
}

interface Balance {
	id: string;
	name: string;
	balance: number;
	currentRate: number;
	interestAccrued: number;
}

interface UnregisteredAccount {
	id: string;
	usedInTransactions: Array<{
		date: string;
		description: string;
		role: 'from' | 'to';
	}>;
}

export class LedgerProcessor {
	private accounts: Account[] = [];
	private transactions: Transaction[] = [];
	private interestRates: InterestRate[] = [];
	private unregisteredAccounts = new Map<string, UnregisteredAccount>();

	parseAccount(line: string) {
		const match = line.match(/account\[\s*(.*?)\s*,\s*"(.*?)"(?:\s*,\s*"(.*?)")?\s*\]/);
		if (!match) return null;
		return {
			id: match[1].trim(),
			name: match[2],
			email: match[3] || ''
		};
	}

	private evaluateExpression(expr: string): number {
		expr = expr.replace(/(\d+)\/(\d+)/g, '($1/$2)');
		try {
			return new Function(`return ${expr}`)();
		} catch {
			console.error('Failed to evaluate expression:', expr);
			return 0;
		}
	}

	private expandMonthlyTransaction(
		startDate: string,
		endDate: string,
		amount: number,
		from: string,
		to: string,
		description: string
	): Transaction[] {
		const [startYear, startMonth, startDay] = startDate.split('.').map(Number);

		const [endYear, endMonth, endDay] =
			endDate === 'INDEFINITE'
				? (() => {
						const now = new Date();
						now.setMonth(now.getMonth() + 1);
						return [now.getFullYear(), now.getMonth() + 1, startDay] as const;
					})()
				: endDate.split('.').map(Number);

		const start = new Date(startYear, startMonth - 1, startDay);
		const end = new Date(endYear, endMonth - 1, endDay);

		const transactions: Transaction[] = [];
		let current = new Date(start);

		while (current <= end) {
			transactions.push({
				date: `${current.getFullYear()}.${String(current.getMonth() + 1).padStart(2, '0')}.${String(current.getDate()).padStart(2, '0')}`,
				amount,
				from,
				to,
				description
			});

			const nextMonth = new Date(current);
			nextMonth.setMonth(nextMonth.getMonth() + 1);

			while (nextMonth.getMonth() !== (current.getMonth() + 1) % 12) {
				nextMonth.setDate(nextMonth.getDate() - 1);
			}

			current = nextMonth;
		}

		return transactions;
	}

	parseTransaction(line: string): Transaction | null {
		let match = line.match(
			/iou\[\s*([\d.]+)\s*,\s*([^,]+)\s*,\s*(.*?)\s*,\s*(.*?)\s*,\s*"(.*?)"\s*\]/
		);
		if (match) {
			const amountExpr = match[2].trim();
			const amount =
				amountExpr.includes('*') || amountExpr.includes('/')
					? this.evaluateExpression(amountExpr)
					: parseFloat(amountExpr);

			const from = match[3].trim();
			const to = match[4].trim();
			const date = match[1];
			const description = match[5];

			// Track unregistered accounts
			if (!this.accounts.some(a => a.id === from)) {
				const account = this.unregisteredAccounts.get(from) || { id: from, usedInTransactions: [] };
				account.usedInTransactions.push({ date, description, role: 'from' });
				this.unregisteredAccounts.set(from, account);
			}
			if (!this.accounts.some(a => a.id === to)) {
				const account = this.unregisteredAccounts.get(to) || { id: to, usedInTransactions: [] };
				account.usedInTransactions.push({ date, description, role: 'to' });
				this.unregisteredAccounts.set(to, account);
			}

			return {
				date,
				amount,
				from,
				to,
				description
			};
		}

		match = line.match(
			/iouMonthly\[\s*([\d.]+)\s*,\s*([\d.]+|INDEFINITE)\s*,\s*([\d.]+)\s*,\s*(.*?)\s*,\s*(.*?)\s*,\s*"(.*?)"\s*\]/
		);
		if (match) {
			const startDate = match[1];
			const endDate = match[2];
			const amount = parseFloat(match[3]);
			const from = match[4].trim();
			const to = match[5].trim();
			const description = match[6];

			const transactions = this.expandMonthlyTransaction(
				startDate,
				endDate,
				amount,
				from,
				to,
				description
			);

			transactions.slice(0, -1).forEach((tx) => this.transactions.push(tx));

			return transactions[transactions.length - 1];
		}

		if (line.includes('iou[') || line.includes('iouMonthly[')) {
			console.error('Failed to parse transaction:', line);
		}
		return null;
	}

	parseInterestRate(line: string): InterestRate | null {
		let match = line.match(/irate\[\s*([\d.]+)\s*\]\s*=\s*\.?(\d+)\s*;/);
		if (match) {
			return {
				date: match[1],
				rate: parseFloat(`0.${match[2]}`)
			};
		}

		match = line.match(/irate\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/);
		if (match) {
			return {
				date: match[1],
				rate: parseFloat(match[2])
			};
		}

		return null;
	}

	private dateDiffInYears(fromDate: string, toDate: string): number {
		const [fromYear, fromMonth, fromDay] = fromDate.split('.').map(Number);
		const [toYear, toMonth, toDay] = toDate.split('.').map(Number);

		const from = new Date(fromYear, fromMonth - 1, fromDay);
		const to = new Date(toYear, toMonth - 1, toDay);

		return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
	}

	private calculateBalances(): Balance[] {
		const balances = new Map<string, number>();
		const interestAccrued = new Map<string, number>();
		let currentRate = 0;
		let lastDate = '';

		this.accounts.forEach((account) => {
			balances.set(account.id, 0);
			interestAccrued.set(account.id, 0);
		});

		const allEvents = [
			...this.transactions.map((t) => ({ type: 'transaction' as const, date: t.date, data: t })),
			...this.interestRates.map((r) => ({ type: 'rate' as const, date: r.date, data: r }))
		].sort((a, b) => a.date.localeCompare(b.date));

		for (const event of allEvents) {
			if (lastDate && currentRate > 0) {
				const years = this.dateDiffInYears(lastDate, event.date);
				for (const [id, balance] of balances.entries()) {
					const interest = balance * currentRate * years;
					balances.set(id, balance * (1 + currentRate * years));
					interestAccrued.set(id, interestAccrued.get(id)! + interest);
				}
			}

			if (event.type === 'rate') {
				currentRate = event.data.rate;
			} else {
				const tx = event.data;
				balances.set(tx.from, balances.get(tx.from)! - tx.amount);
				balances.set(tx.to, balances.get(tx.to)! + tx.amount);
			}

			lastDate = event.date;
		}

		// Calculate final interest up to today if there's a current rate
		if (currentRate > 0 && lastDate) {
			const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
			const years = this.dateDiffInYears(lastDate, today);
			for (const [id, balance] of balances.entries()) {
				const interest = balance * currentRate * years;
				balances.set(id, balance * (1 + currentRate * years));
				interestAccrued.set(id, interestAccrued.get(id)! + interest);
			}
		}

		return this.accounts.map((account) => ({
			id: account.id,
			name: account.name,
			balance: Math.round(balances.get(account.id)! * 100) / 100,
			currentRate,
			interestAccrued: Math.round(interestAccrued.get(account.id)! * 100) / 100
		}));
	}

	processLedger(content: string): Ledger & { error?: string; unregisteredAccounts?: UnregisteredAccount[] } {
		this.accounts = [];
		this.transactions = [];
		this.interestRates = [];
		this.unregisteredAccounts.clear();

		const lines = content.split('\n');
		let reachedEnd = false;
		let lineNumber = 0;

		try {
			// First pass: identify all accounts (both registered and unregistered)
			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('(*')) continue;

				const transaction = this.parseTransaction(trimmed);
				if (transaction) {
					// Track unregistered accounts
					if (!this.accounts.some(a => a.id === transaction.from)) {
						const account = this.unregisteredAccounts.get(transaction.from) || { 
							id: transaction.from, 
							usedInTransactions: [] 
						};
						account.usedInTransactions.push({ 
							date: transaction.date, 
							description: transaction.description, 
							role: 'from' 
						});
						this.unregisteredAccounts.set(transaction.from, account);
					}
					if (!this.accounts.some(a => a.id === transaction.to)) {
						const account = this.unregisteredAccounts.get(transaction.to) || { 
							id: transaction.to, 
							usedInTransactions: [] 
						};
						account.usedInTransactions.push({ 
							date: transaction.date, 
							description: transaction.description, 
							role: 'to' 
						});
						this.unregisteredAccounts.set(transaction.to, account);
					}
				}
			}

			// Add unregistered accounts to the main accounts list
			for (const [id, ua] of this.unregisteredAccounts) {
				if (!this.accounts.some(a => a.id === id)) {
					this.accounts.push({
						id: id,
						name: `Unregistered Account ${id}`,
						email: ''
					});
				}
			}

			// Second pass: process all transactions and rates
			for (const line of lines) {
				lineNumber++;
				const trimmed = line.trim();

				if (trimmed === '[MAGIC_LEDGER_END]') {
					reachedEnd = true;
					continue;
				}
				if (reachedEnd) continue;

				if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('(*')) continue;

				const account = this.parseAccount(trimmed);
				if (account) {
					// Update the account name if it exists (might be an unregistered account)
					const existingIndex = this.accounts.findIndex(a => a.id === account.id);
					if (existingIndex >= 0) {
						this.accounts[existingIndex] = account;
					} else {
						this.accounts.push(account);
					}
					continue;
				}

				const transaction = this.parseTransaction(trimmed);
				if (transaction) {
					this.transactions.push(transaction);
					continue;
				}

				const rate = this.parseInterestRate(trimmed);
				if (rate) {
					this.interestRates.push(rate);
					continue;
				}

				// If we get here and the line looks like it was meant to be parsed,
				// it's probably a syntax error
				if (
					trimmed.includes('account[') ||
					trimmed.includes('iou[') ||
					trimmed.includes('irate[')
				) {
					throw new Error(`Invalid syntax at line ${lineNumber}: ${trimmed}`);
				}
			}

			const balances = this.calculateBalances();

			const accountsWithBalances = this.accounts.map((account) => {
				const balance = balances.find((b) => b.id === account.id);
				return {
					...account,
					balance: balance?.balance ?? 0,
					interestAccrued: balance?.interestAccrued ?? 0
				};
			});

			return {
				id: 'local',
				accounts: accountsWithBalances,
				transactions: this.transactions,
				interestRates: this.interestRates,
				unregisteredAccounts: Array.from(this.unregisteredAccounts.values())
			};
		} catch (error) {
			return {
				id: 'local',
				accounts: [],
				transactions: [],
				interestRates: [],
				error: error instanceof Error ? error.message : String(error),
				unregisteredAccounts: []
			};
		}
	}
}
