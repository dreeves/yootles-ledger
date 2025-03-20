import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadLedger } from '$lib/server/ledger';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const ledger = await loadLedger(params.name);
    return json(ledger);
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to load ledger' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const data = await request.json();
    // TODO: Implement saving ledger
    return json({ success: true });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save ledger' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};