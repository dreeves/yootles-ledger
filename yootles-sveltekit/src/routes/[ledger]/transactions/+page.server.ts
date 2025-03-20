import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadLedger } from '$lib/server/ledger';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const ledger = await loadLedger(params.ledger);

		// Sort transactions by date descending by default
		ledger.transactions.sort((a, b) => b.date.localeCompare(a.date));

		return {
			ledger
		};
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		if (message === 'Invalid ledger name') {
			throw error(404, 'Ledger not found');
		}
		console.error('Error loading ledger:', e);
		throw error(500, 'Failed to load ledger');
	}
};
