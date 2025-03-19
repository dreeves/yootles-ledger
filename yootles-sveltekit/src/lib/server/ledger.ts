import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Ledger, Transaction, Account } from '$lib/types/ledger';

function parseAccount(line: string): Account | null {
  const match = line.match(/account\[(.*?),\s*"(.*?)",\s*"(.*?)"\]/);
  if (!match) return null;
  return {
    id: match[1].trim(),
    name: match[2],
    email: match[3]
  };
}

function parseTransaction(line: string): Transaction | null {
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

function parseInterestRate(line: string): { date: string; rate: number } | null {
  const match = line.match(/irate\[([\d.]+),\s*([\d.]+)\]/);
  if (!match) return null;
  return {
    date: match[1],
    rate: parseFloat(match[2])
  };
}

export async function loadLedger(name: string): Promise<Ledger> {
  try {
    // Read the ledger file from the data directory
    const filePath = join(process.cwd(), '..', 'data', `${name}-snapshot.txt`);
    const content = await readFile(filePath, 'utf-8');

    const lines = content.split('\n');
    const accounts: Account[] = [];
    const transactions: Transaction[] = [];
    const interestRates: Array<{ date: string; rate: number }> = [];

    let reachedEnd = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Stop parsing at MAGIC_LEDGER_END
      if (trimmedLine === '[MAGIC_LEDGER_END]') {
        reachedEnd = true;
        continue;
      }
      if (reachedEnd) continue;

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;

      // Parse different types of entries
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

    return {
      accounts,
      transactions,
      interestRates
    };
  } catch (error) {
    console.error('Error loading ledger:', error);
    throw new Error(`Failed to load ledger "${name}": ${error.message}`);
  }
}

export async function saveLedger(name: string, ledger: Ledger): Promise<void> {
  // TODO: Implement ledger saving
  // This will be implemented when we need to save changes
  throw new Error('Not implemented');
}