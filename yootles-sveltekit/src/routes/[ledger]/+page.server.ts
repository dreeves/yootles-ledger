import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadLedger } from '$lib/server/ledger';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const ledger = await loadLedger(params.ledger);
		return {
			ledger,
			error: ledger.error
		};
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		if (message.startsWith('Parse error')) {
			return {
				ledger: {
					id: params.ledger,
					accounts: [],
					transactions: [],
					interestRates: [],
					error: message
				}
			};
		}
		switch (message) {
			case 'INVALID_NAME':
				throw error(
					400,
					'Invalid ledger name. Use only letters, numbers, hyphens, and underscores.'
				);
			case 'NOT_FOUND':
				throw error(404, 'Ledger not found');
			case 'EMPTY_FILE':
				throw error(400, 'Ledger file is empty');
			case 'NO_ACCOUNTS':
				throw error(400, 'Ledger has no accounts defined');
			default:
				throw error(500, 'Failed to load ledger');
		}
	}
};
