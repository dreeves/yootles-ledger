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
      const formData = new URLSearchParams();
      formData.append('ledger', String(data));

      console.error('Sending request:', {
        url: this.config.baseUrl,
        data: formData.toString()
      });

      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData,
        signal: this.controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Wolfram API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Wolfram client error:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async calculateBalances(ledger: string): Promise<WolframResponse<BalanceResult>> {
    if (!ledger) {
      throw new Error('Ledger content is required');
    }
    return this.request<BalanceResult>(ledger);
  }

  abort(): void {
    this.controller.abort();
    this.controller = new AbortController();
  }
}