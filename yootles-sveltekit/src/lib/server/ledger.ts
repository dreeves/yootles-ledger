import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Ledger, Transaction, Account } from '$lib/types/ledger';
import { WolframClient } from './wolfram/client';
import { getWolframConfig } from './wolfram/config';

export function parseAccount(line: string): Account | null {
  const match = line.match(/account\[\s*(.*?)\s*,\s*"(.*?)"\s*,\s*"(.*?)"\s*\]/);
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

export async function loadLedger(name: string): Promise<Ledger> {
  try {
    if (name === 'socket.io') {
      throw new Error('Invalid ledger name');
    }

    // Read the raw ledger file
    const filePath = join(process.cwd(), '..', 'data', `${name}-snapshot.txt`);
    const content = await readFile(filePath, 'utf-8');

    // Process the ledger using Wolfram Cloud
    const client = new WolframClient(getWolframConfig());
    const result = await client.calculateBalances(content);

    if (result.status === 'error' || !result.data) {
      throw new Error(result.error || 'Failed to process ledger');
    }

    // Convert Wolfram response to our Ledger type
    return {
      id: name,
      accounts: result.data.accounts,
      transactions: result.data.transactions,
      interestRates: result.data.interestRates
    };
  } catch (error) {
    if (error.message === 'Invalid ledger name') {
      throw error;
    }
    console.error('Error loading ledger:', error);
    throw new Error(`Failed to load ledger "${name}": ${error.message}`);
  }
}