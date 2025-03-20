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
      email: match[3] || ''
    };
  }

  parseTransaction(line: string): Transaction | null {
    const match = line.match(/iou\[\s*([\d.]+)\s*,\s*(.*?)\s*,\s*(.*?)\s*,\s*([\d.]+)\s*,\s*"(.*?)"\s*\]/);
    if (!match) return null;
    return {
      date: match[4],
      amount: parseFloat(match[1]),
      from: match[2].trim(),
      to: match[3].trim(),
      description: match[5]
    };
  }

  parseInterestRate(line: string): InterestRate | null {
    // Try equals format: irate[date] = .05;
    let match = line.match(/irate\[\s*([\d.]+)\s*\]\s*=\s*\.?(\d+)\s*;/);
    if (match) {
      return {
        date: match[1],
        rate: parseFloat(`0.${match[2]}`)
      };
    }

    // Try comma format: irate[date, 0.05]
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
    let currentRate = 0;
    let lastDate = '';

    // Initialize balances
    this.accounts.forEach(account => {
      balances.set(account.id, 0);
    });

    // Sort all events chronologically
    const allEvents = [
      ...this.transactions.map(t => ({ type: 'transaction' as const, date: t.date, data: t })),
      ...this.interestRates.map(r => ({ type: 'rate' as const, date: r.date, data: r }))
    ].sort((a, b) => a.date.localeCompare(b.date));

    // Process events
    for (const event of allEvents) {
      // Apply interest since last event
      if (lastDate && currentRate > 0) {
        const years = this.dateDiffInYears(lastDate, event.date);
        for (const [id, balance] of balances.entries()) {
          balances.set(id, balance * (1 + currentRate * years));
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

    // Return final balances
    return this.accounts.map(account => ({
      id: account.id,
      name: account.name,
      balance: Math.round(balances.get(account.id)! * 100) / 100,
      currentRate
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

      if (!trimmed || trimmed.startsWith('#')) continue;

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

    // Merge balances with accounts
    const accountsWithBalances = this.accounts.map(account => {
      const balance = balances.find(b => b.id === account.id);
      return {
        ...account,
        balance: balance?.balance ?? 0
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