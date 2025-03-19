export interface Account {
  id: string;
  name: string;
  email: string;
}

export interface Transaction {
  amount: number;
  from: string;
  to: string;
  date: string;
  description: string;
}

export interface Ledger {
  accounts: Account[];
  transactions: Transaction[];
  interestRates: Array<{
    date: string;
    rate: number;
  }>;
}