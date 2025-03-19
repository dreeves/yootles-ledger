import type { WolframConfig, WolframResponse, BalanceResult, TransactionHistory } from './types';
import type { Ledger } from '$lib/types/ledger';

export class WolframClient {
  private config: WolframConfig;
  private controller: AbortController;

  constructor(config: WolframConfig) {
    this.config = config;
    this.controller = new AbortController();
  }

  private async request<T>(endpoint: string, data: unknown): Promise<WolframResponse<T>> {
    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(data),
        signal: this.controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        status: 'success',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async calculateBalances(ledger: Ledger): Promise<WolframResponse<BalanceResult>> {
    return this.request<BalanceResult>('/calculate-balances', ledger);
  }

  async getTransactionHistory(ledger: string, account: string): Promise<WolframResponse<TransactionHistory>> {
    return this.request<TransactionHistory>('/transaction-history', { ledger, account });
  }

  abort(): void {
    this.controller.abort();
    this.controller = new AbortController();
  }
}