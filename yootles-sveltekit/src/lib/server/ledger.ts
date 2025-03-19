import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Ledger, Transaction, Account } from '$lib/types/ledger';
import { WolframClient } from './wolfram/client';
import { getWolframConfig } from './wolfram/config';

export function parseAccount(line: string): Account | null {
  const match = line.match(/account\[\s*(.*?)\s*,\s*"(.*?)"\s*(?:,\s*"(.*?)"\s*)?\]/);
  if (!match) return null;
  return {
    id: match[1].trim(),
    name: match[2],
    email: match[3] || ''  // Default to empty string if email is not provided
  };
}

export function parseTransaction(line: string): Transaction | null {
  const match = line.match(/iou\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*(.*?)\s*,\s*(.*?)\s*,\s*"(.*?)"\s*\]/);
  if (!match) return null;
  return {
    date: match[1],
    amount: parseFloat(match[2]),
    from: match[3].trim(),
    to: match[4].trim(),
    description: match[5]
  };
}

export function parseInterestRate(line: string): { date: string; rate: number } | null {
  const match = line.match(/irate\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/);
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
    console.error('Attempting to read file:', filePath);
    
    try {
      const content = await readFile(filePath, 'utf-8');
      if (!content) {
        throw new Error('Ledger file is empty');
      }

      // Process the ledger using Wolfram Cloud
      const client = new WolframClient(getWolframConfig());
      const result = await client.calculateBalances(content);

      if (result.status === 'error' || !result.data) {
        throw new Error(result.error || 'Failed to process ledger');
      }

      // Create a map of balances by account ID
      const balanceMap = new Map(
        result.data.balances.map(b => [b.id, b.balance])
      );

      // Merge account data with balances
      const accounts = result.data.accounts.map(account => ({
        ...account,
        balance: balanceMap.get(account.id) ?? 0
      }));

      return {
        id: name,
        accounts,
        transactions: Array.isArray(result.data.transactions) ? result.data.transactions : [],
        interestRates: Array.isArray(result.data.interestRates) ? result.data.interestRates : []
      };
    } catch (fileError) {
      console.error('File read error:', {
        error: fileError,
        cwd: process.cwd(),
        filePath
      });
      throw fileError;
    }
  } catch (error) {
    if (error.message === 'Invalid ledger name') {
      throw error;
    }
    console.error('Error loading ledger:', error);
    throw new Error(`Failed to load ledger "${name}": ${error.message}`);
  }
}