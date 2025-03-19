import type { PageServerLoad } from './$types';
import { loadLedger } from '$lib/server/ledger';

export const load: PageServerLoad = async ({ params }) => {
  const ledger = await loadLedger(params.ledger);
  return {
    ledger
  };
};