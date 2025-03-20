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

  private evaluateExpression(expr: string): number {
    // Handle common patterns like "25/60*20" or "3.01*35"
    expr = expr.replace(/(\d+)\/(\d+)/g, '($1/$2)');
    try {
      return new Function(`return ${expr}`)();
    } catch (e) {
      console.error('Failed to evaluate expression:', expr);
      return 0;
    }
  }

  private expandMonthlyTransaction(startDate: string, endDate: string, amount: number, from: string, to: string, description: string): Transaction[] {
    const [startYear, startMonth, startDay] = startDate.split('.').map(Number);
    
    // For INDEFINITE transactions, generate only up to current month plus one
    // This ensures we always have at least one future transaction while keeping processing efficient
    let [endYear, endMonth, endDay] = endDate === 'INDEFINITE'
      ? (() => {
          const now = new Date();
          now.setMonth(now.getMonth() + 1); // Add one month
          return [
            now.getFullYear(),
            now.getMonth() + 1,
            startDay // Keep the same day of month as start date
          ];
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
      
      // Move to next month, keeping the same day of month
      const nextMonth = new Date(current);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      // If we went too far into next month (e.g. Jan 31 -> Feb 31), roll back to last valid day
      while (nextMonth.getMonth() !== (current.getMonth() + 1) % 12) {
        nextMonth.setDate(nextMonth.getDate() - 1);
      }
      
      current = nextMonth;
    }
    
    return transactions;
  }

  parseTransaction(line: string): Transaction | null {
    // Try regular transaction: iou[date, amount, from, to, "description"]
    let match = line.match(/iou\[\s*([\d.]+)\s*,\s*([^,]+)\s*,\s*(.*?)\s*,\s*(.*?)\s*,\s*"(.*?)"\s*\]/);
    if (match) {
      const amountExpr = match[2].trim();
      const amount = amountExpr.includes('*') || amountExpr.includes('/')
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

    // Try monthly transaction: iouMonthly[startDate, endDate, amount, from, to, "description"]
    match = line.match(/iouMonthly\[\s*([\d.]+)\s*,\s*([\d.]+|INDEFINITE)\s*,\s*([\d.]+)\s*,\s*(.*?)\s*,\s*(.*?)\s*,\s*"(.*?)"\s*\]/);
    if (match) {
      const startDate = match[1];
      const endDate = match[2];
      const amount = parseFloat(match[3]);
      const from = match[4].trim();
      const to = match[5].trim();
      const description = match[6];

      // Generate all transactions in the series
      const transactions = this.expandMonthlyTransaction(startDate, endDate, amount, from, to, description);
      
      // Add all transactions to the list except the last one
      transactions.slice(0, -1).forEach(tx => this.transactions.push(tx));
      
      // Return the last transaction
      return transactions[transactions.length - 1];
    }

    // Only log if it looks like it might be a transaction
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
    let currentRate = 0;
    let lastDate = '';

    this.accounts.forEach(account => {
      balances.set(account.id, 0);
    });

    const allEvents = [
      ...this.transactions.map(t => ({ type: 'transaction' as const, date: t.date, data: t })),
      ...this.interestRates.map(r => ({ type: 'rate' as const, date: r.date, data: r }))
    ].sort((a, b) => a.date.localeCompare(b.date));

    console.error('Processing events:', allEvents);

    for (const event of allEvents) {
      if (lastDate && currentRate > 0) {
        const years = this.dateDiffInYears(lastDate, event.date);
        for (const [id, balance] of balances.entries()) {
          balances.set(id, balance * (1 + currentRate * years));
        }
      }

      if (event.type === 'rate') {
        currentRate = event.data.rate;
        console.error('Updated interest rate:', { date: event.date, rate: currentRate });
      } else {
        const tx = event.data;
        balances.set(tx.from, balances.get(tx.from)! - tx.amount);
        balances.set(tx.to, balances.get(tx.to)! + tx.amount);
        console.error('Applied transaction:', { 
          date: tx.date, 
          amount: tx.amount, 
          from: tx.from, 
          to: tx.to,
          newFromBalance: balances.get(tx.from),
          newToBalance: balances.get(tx.to)
        });
      }

      lastDate = event.date;
    }

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

      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('(*')) continue;

      const account = this.parseAccount(trimmed);
      if (account) {
        this.accounts.push(account);
        console.error('Added account:', account);
        continue;
      }

      const transaction = this.parseTransaction(trimmed);
      if (transaction) {
        this.transactions.push(transaction);
        console.error('Added transaction:', transaction);
        continue;
      }

      const rate = this.parseInterestRate(trimmed);
      if (rate) {
        this.interestRates.push(rate);
        console.error('Added interest rate:', rate);
      }
    }

    console.error('Parsed ledger:', {
      accounts: this.accounts,
      transactions: this.transactions,
      interestRates: this.interestRates
    });

    const balances = this.calculateBalances();

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