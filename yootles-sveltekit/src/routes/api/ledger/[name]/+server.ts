import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadLedger } from '$lib/server/ledger';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const ledger = await loadLedger(params.name);
		return json(ledger);
	} catch {
		return new Response(JSON.stringify({ error: 'Failed to load ledger' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

export const POST: RequestHandler = async () => {
	// TODO: Implement saving ledger
	return json({ success: true });
};
