import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadLedger } from '$lib/server/ledger';

export const load: PageServerLoad = async ({ params }) => {
  try {
    const ledger = await loadLedger(params.ledger);
    return {
      ledger
    };
  } catch (e) {
    if (e.message === 'Invalid ledger name') {
      throw error(404, 'Ledger not found');
    }
    throw error(500, 'Failed to load ledger');
  }
};