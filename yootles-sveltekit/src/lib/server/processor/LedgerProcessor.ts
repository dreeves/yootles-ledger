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

export class LedgerProcessor {
	private accounts: Account[] = [];
	private transactions: Transaction[] = [];
	private interestRates: InterestRate[] = [];

	parseAccount(line: string): Account | null {
		const match = line.match(/account\[\s*(.*?)\s*,\s*"(.*?)"(?:\s*,\s*"(.*?)")?\s*\]/);
		if (!match) return null;
		return {
			id: match[1].trim(),
			name: match[2],
			email: match[3] || '',
			balance: 0,
			interestAccrued: 0
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

			return {
				date: match[1],
				amount,
				from: match[3].trim(),
				to: match[4].trim(),
				description: match[5]
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

	processLedger(content: string): Ledger {
		this.accounts = [];
		this.transactions = [];
		this.interestRates = [];

		const lines = content.split('\n');
		let reachedEnd = false;

		for (const line of lines) {
			const trimmed = line.trim();

			if (trimmed === '[MAGIC_LEDGER_END]') {
				reachedEnd = true;
				continue;
			}
			if (reachedEnd) continue;

			if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('(*')) continue;

			const account = this.parseAccount(trimmed);
			if (account) {
				this.accounts.push(account);
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
			interestRates: this.interestRates
		};
	}
}
