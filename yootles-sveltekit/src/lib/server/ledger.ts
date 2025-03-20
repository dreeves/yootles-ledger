import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Ledger } from '$lib/types/ledger';
import { LedgerProcessor } from './processor/LedgerProcessor';

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

      if (!content.trim()) {
        throw new Error('Ledger file is empty');
      }

      // Log the entire content for debugging
      console.error('=== START LEDGER CONTENT ===');
      console.error(content);
      console.error('=== END LEDGER CONTENT ===');

      // Process the ledger using our local processor
      const processor = new LedgerProcessor();
      const result = processor.processLedger(content);

      return {
        ...result,
        id: name
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