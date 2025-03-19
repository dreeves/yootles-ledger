import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Ledger } from '$lib/types/ledger';
import { WolframClient } from './wolfram/client';
import { getWolframConfig } from './wolfram/config';

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

      console.error('Loaded ledger content:', content.substring(0, 100) + '...');

      // Process the ledger using Wolfram Cloud
      const client = new WolframClient(getWolframConfig());
      const result = await client.calculateBalances(content);

      console.log('Wolfram Cloud response:', result);

      if (result.status === 'error' || !result.data) {
        throw new Error(result.error || 'Failed to process ledger');
      }

      // Validate and log the accounts data
      if (!Array.isArray(result.data.accounts)) {
        console.error('Invalid accounts data:', result.data.accounts);
        throw new Error('Invalid response: accounts is not an array');
      }

      console.log('Found accounts:', result.data.accounts);

      // Ensure all required data is present and balances are valid numbers
      const accounts = result.data.accounts.map(account => {
        if (!account.id || !account.name) {
          console.error('Invalid account data:', account);
          throw new Error('Invalid account data received from Wolfram Cloud');
        }
        
        // Ensure balance is a valid number or default to 0
        const balance = account.balance;
        const validBalance = typeof balance === 'number' && !isNaN(balance) ? balance : 0;
        
        return {
          ...account,
          balance: validBalance
        };
      });

      console.log('Processed accounts:', accounts);

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