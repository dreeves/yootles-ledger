import type { WolframConfig, WolframResponse, BalanceResult } from './types';

export class WolframClient {
  private config: WolframConfig;
  private controller: AbortController;

  constructor(config: WolframConfig) {
    this.config = config;
    this.controller = new AbortController();
  }

  private async request<T>(data: unknown): Promise<WolframResponse<T>> {
    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        signal: this.controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async calculateBalances(ledger: string): Promise<WolframResponse<BalanceResult>> {
    return this.request<BalanceResult>({ ledger });
  }

  abort(): void {
    this.controller.abort();
    this.controller = new AbortController();
  }
}