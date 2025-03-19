import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { Ledger } from '$lib/types/ledger';
import { WolframClient } from './wolfram/client';
import { getWolframConfig } from './wolfram/config';

async function fetchFromEtherpad(name: string): Promise<string> {
  const response = await fetch(`https://padm.us/yl-${name}/export/txt`);
  if (!response.ok) {
    throw new Error(`Failed to fetch from padm.us: ${response.statusText}`);
  }
  return response.text();
}

export async function loadLedger(name: string): Promise<Ledger> {
  try {
    if (name === 'socket.io') {
      throw new Error('Invalid ledger name');
    }

    const filePath = join(process.cwd(), '..', 'data', `${name}-snapshot.txt`);
    let content: string;

    try {
      // Try to read snapshot file
      content = await readFile(filePath, 'utf-8');
      
      // If snapshot is empty, try to fetch from Etherpad
      if (!content.trim()) {
        console.log('Empty snapshot, fetching from Etherpad...');
        content = await fetchFromEtherpad(name);
        
        // Save the fetched content to snapshot
        if (content.trim()) {
          await writeFile(filePath, content, 'utf-8');
        }
      }
    } catch (fileError) {
      // If file doesn't exist or other error, try Etherpad
      console.log('No snapshot found, fetching from Etherpad...');
      content = await fetchFromEtherpad(name);
      
      // Save the fetched content to snapshot
      if (content.trim()) {
        await writeFile(filePath, content, 'utf-8');
      }
    }

    // If we still have no content, return an empty ledger
    if (!content.trim()) {
      return {
        id: name,
        accounts: [],
        transactions: [],
        interestRates: []
      };
    }

    console.log('Processing ledger content:', {
      contentPreview: content.substring(0, 200),
      length: content.length
    });

    // Process the ledger using Wolfram Cloud
    const client = new WolframClient(getWolframConfig());
    const result = await client.calculateBalances(content);

    console.log('Wolfram Cloud response:', result);

    if (result.status === 'error' || !result.data) {
      throw new Error(result.error || 'Failed to process ledger');
    }

    // Validate the response data
    if (!Array.isArray(result.data.accounts)) {
      throw new Error('Invalid response: accounts is not an array');
    }

    if (!Array.isArray(result.data.transactions)) {
      throw new Error('Invalid response: transactions is not an array');
    }

    if (!Array.isArray(result.data.interestRates)) {
      throw new Error('Invalid response: interestRates is not an array');
    }

    // Ensure balances are numbers
    const accounts = result.data.accounts.map(account => ({
      ...account,
      balance: typeof account.balance === 'number' ? account.balance : 0
    }));

    return {
      id: name,
      accounts,
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