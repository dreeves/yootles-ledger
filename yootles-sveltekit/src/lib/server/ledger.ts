import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { Ledger, Transaction, Account } from '$lib/types/ledger';

export function parseAccount(line: string): Account | null {
  const match = line.match(/account\[(.*?),\s*"(.*?)",\s*"(.*?)"\]/);
  if (!match) return null;
  return {
    id: match[1].trim(),
    name: match[2],
    email: match[3]
  };
}

export function parseTransaction(line: string): Transaction | null {
  const match = line.match(/iou\[(.*?),\s*(.*?),\s*(.*?),\s*([\d.]+),\s*"(.*?)"\]/);
  if (!match) return null;
  return {
    amount: parseFloat(match[1]),
    from: match[2].trim(),
    to: match[3].trim(),
    date: match[4],
    description: match[5]
  };
}

export function parseInterestRate(line: string): { date: string; rate: number } | null {
  const match = line.match(/irate\[([\d.]+),\s*([\d.]+)\]/);
  if (!match) return null;
  return {
    date: match[1],
    rate: parseFloat(match[2])
  };
}

function validateLedger(ledger: Ledger): void {
  // Validate accounts
  if (!Array.isArray(ledger.accounts)) {
    throw new Error('Ledger accounts must be an array');
  }
  
  const accountIds = new Set(ledger.accounts.map(a => a.id));
  
  // Validate transactions
  if (!Array.isArray(ledger.transactions)) {
    throw new Error('Ledger transactions must be an array');
  }
  
  for (const tx of ledger.transactions) {
    if (!accountIds.has(tx.from)) {
      throw new Error(`Transaction references unknown account: ${tx.from}`);
    }
    if (!accountIds.has(tx.to)) {
      throw new Error(`Transaction references unknown account: ${tx.to}`);
    }
    if (isNaN(tx.amount) || tx.amount <= 0) {
      throw new Error(`Invalid transaction amount: ${tx.amount}`);
    }
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(tx.date)) {
      throw new Error(`Invalid transaction date format: ${tx.date}`);
    }
  }
  
  // Validate interest rates
  if (!Array.isArray(ledger.interestRates)) {
    throw new Error('Ledger interest rates must be an array');
  }
  
  for (const rate of ledger.interestRates) {
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(rate.date)) {
      throw new Error(`Invalid interest rate date format: ${rate.date}`);
    }
    if (isNaN(rate.rate) || rate.rate < 0) {
      throw new Error(`Invalid interest rate: ${rate.rate}`);
    }
  }
}

export async function loadLedger(name: string): Promise<Ledger> {
  try {
    if (name === 'socket.io') {
      throw new Error('Invalid ledger name');
    }

    const filePath = join(process.cwd(), '..', 'data', `${name}-snapshot.txt`);
    const content = await readFile(filePath, 'utf-8');

    const lines = content.split('\n');
    const accounts: Account[] = [];
    const transactions: Transaction[] = [];
    const interestRates: Array<{ date: string; rate: number }> = [];

    let reachedEnd = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '[MAGIC_LEDGER_END]') {
        reachedEnd = true;
        continue;
      }
      if (reachedEnd) continue;

      if (!trimmedLine || trimmedLine.startsWith('#')) continue;

      const account = parseAccount(trimmedLine);
      if (account) {
        accounts.push(account);
        continue;
      }

      const transaction = parseTransaction(trimmedLine);
      if (transaction) {
        transactions.push(transaction);
        continue;
      }

      const interestRate = parseInterestRate(trimmedLine);
      if (interestRate) {
        interestRates.push(interestRate);
      }
    }

    const ledger = {
      id: name,
      accounts,
      transactions,
      interestRates
    };

    // Validate the loaded ledger
    validateLedger(ledger);

    return ledger;
  } catch (error) {
    if (error.message === 'Invalid ledger name') {
      throw error;
    }
    console.error('Error loading ledger:', error);
    throw new Error(`Failed to load ledger "${name}": ${error.message}`);
  }
}

export async function saveLedger(name: string, ledger: Ledger): Promise<void> {
  try {
    // Validate before saving
    validateLedger(ledger);

    const filePath = join(process.cwd(), '..', 'data', `${name}-snapshot.txt`);
    
    const lines: string[] = [];
    
    ledger.accounts.forEach(account => {
      lines.push(formatAccount(account));
    });
    
    lines.push('');
    
    ledger.interestRates.forEach(rate => {
      lines.push(formatInterestRate(rate));
    });
    
    lines.push('');
    
    ledger.transactions
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(tx => {
        lines.push(formatTransaction(tx));
      });
    
    lines.push('');
    lines.push('[MAGIC_LEDGER_END]');
    
    await writeFile(filePath, lines.join('\n'), 'utf-8');
  } catch (error) {
    console.error('Error saving ledger:', error);
    throw new Error(`Failed to save ledger "${name}": ${error.message}`);
  }
}