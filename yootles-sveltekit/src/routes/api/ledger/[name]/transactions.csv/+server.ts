import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadLedger } from '$lib/server/ledger';

function formatDate(date: string): string {
  const [year, month, day] = date.split('.');
  return `${year}-${month}-${day}`;
}

function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const GET: RequestHandler = async ({ params }) => {
  try {
    const ledger = await loadLedger(params.name);

    // Create CSV header
    const headers = ['Date', 'From', 'To', 'Amount', 'Description'];
    
    // Format transactions
    const rows = ledger.transactions.map(tx => {
      const fromName = ledger.accounts.find(a => a.id === tx.from)?.name || tx.from;
      const toName = ledger.accounts.find(a => a.id === tx.to)?.name || tx.to;
      
      return [
        formatDate(tx.date),
        escapeCSV(fromName),
        escapeCSV(toName),
        tx.amount.toFixed(2),
        escapeCSV(tx.description)
      ].join(',');
    });

    // Combine header and rows
    const csv = [headers.join(','), ...rows].join('\n');

    // Return CSV file
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${params.name}-transactions.csv"`
      }
    });
  } catch (e) {
    if (e.message === 'Invalid ledger name') {
      throw error(404, 'Ledger not found');
    }
    throw error(500, 'Failed to generate CSV');
  }
};