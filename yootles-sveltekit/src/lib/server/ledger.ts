import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Ledger } from '$lib/types/ledger';
import { LedgerProcessor } from './processor/LedgerProcessor';

export async function loadLedger(name: string): Promise<Ledger> {
  try {
    // Validate ledger name
    if (!name || name === 'socket.io' || !/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error('INVALID_NAME');
    }

    // Read the raw ledger file
    const filePath = join(process.cwd(), '..', 'data', `${name}-snapshot.txt`);
    
    try {
      const content = await readFile(filePath, 'utf-8');
      
      if (!content || !content.trim()) {
        throw new Error('EMPTY_FILE');
      }

      // Process the ledger using our local processor
      const processor = new LedgerProcessor();
      const result = processor.processLedger(content);

      if (!result.accounts.length) {
        throw new Error('NO_ACCOUNTS');
      }

      return {
        ...result,
        id: name
      };
    } catch (fileError) {
      if (fileError.code === 'ENOENT') {
        throw new Error('NOT_FOUND');
      }
      if (fileError.message === 'EMPTY_FILE') {
        throw new Error('EMPTY_FILE');
      }
      if (fileError.message === 'NO_ACCOUNTS') {
        throw new Error('NO_ACCOUNTS');
      }
      console.error('File read error:', {
        error: fileError,
        cwd: process.cwd(),
        filePath
      });
      throw new Error('READ_ERROR');
    }
  } catch (error) {
    console.error('Error loading ledger:', error);
    throw error;
  }
}