export interface Account {
	id: string;
	name: string;
	email: string;
	balance?: number;
	interestAccrued?: number;
}

export interface Transaction {
	amount: number;
	from: string;
	to: string;
	date: string;
	description: string;
	balance?: number;
	interestAccrued?: number;
}

export interface UnregisteredAccount {
	id: string;
	usedInTransactions: Array<{
		date: string;
		description: string;
		role: 'from' | 'to';
	}>;
}

export type CombinedAccount =
	| Account
	| (UnregisteredAccount & {
			name: string;
			email: string;
			balance: number;
			interestAccrued: number;
			isUnregistered: true;
			transactionCount: number;
	  });

export interface Ledger {
	id?: string;
	accounts: Account[];
	transactions: Transaction[];
	interestRates: Array<{
		date: string;
		rate: number;
	}>;
	error?: string;
	unregisteredAccounts?: UnregisteredAccount[];
}
