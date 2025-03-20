export interface WolframResponse<T> {
	status: 'success' | 'error';
	data?: T;
	error?: string;
	timestamp: string;
}

export interface BalanceResult {
	balances: Record<string, number>;
	interestRate: number;
	lastCalculated: string;
}

export interface TransactionHistoryEntry {
	date: string;
	amount: number;
	balance: number;
	description: string;
}

export interface TransactionHistory {
	account: string;
	transactions: TransactionHistoryEntry[];
	totalBalance: number;
	lastUpdated: string;
}

export interface WolframConfig {
	apiKey: string;
	baseUrl: string;
	timeout: number;
	retryAttempts: number;
}
