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
				data: String(data).substring(0, 100) + '...'
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
					body: errorText,
					url: this.config.baseUrl
				});
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();

			console.error('Wolfram API raw response:', {
				status: result.status,
				timestamp: result.timestamp,
				data: result.data
					? {
							accountCount: result.data.accounts?.length,
							transactionCount: result.data.transactions?.length,
							interestRateCount: result.data.interestRates?.length,
							interestRates: result.data.interestRates,
							firstTransaction: result.data.transactions?.[0],
							firstAccount: result.data.accounts?.[0]
						}
					: null,
				error: result.error
			});

			return result;
		} catch (error) {
			console.error('Wolfram client error:', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				config: this.config
			});

			return {
				status: 'error',
				error: error instanceof Error ? error.message : String(error),
				timestamp: new Date().toISOString()
			};
		}
	}

	async calculateBalances(ledger: string): Promise<WolframResponse<BalanceResult>> {
		if (!ledger) {
			throw new Error('Ledger content is required');
		}
		console.error('Calculating balances for ledger:', {
			contentLength: ledger.length,
			preview: ledger.substring(0, 100) + '...',
			interestRates: ledger.match(/irate\[.*?\].*?;/g) || [],
			rawInterestRates: ledger.match(/irate\[.*?\]/g) || [],
			interestRateLines: ledger.split('\n').filter((line) => line.includes('irate'))
		});
		return this.request<BalanceResult>(ledger);
	}

	abort(): void {
		this.controller.abort();
		this.controller = new AbortController();
	}
}
