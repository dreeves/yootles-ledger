import type { Ledger, Transaction, Account } from '$lib/types/ledger';

export async function loadLedger(name: string): Promise<Ledger> {
  // TODO: Implement ledger loading from file system
  throw new Error('Not implemented');
}

export async function saveLedger(name: string, ledger: Ledger): Promise<void> {
  // TODO: Implement ledger saving to file system
  throw new Error('Not implemented');
}