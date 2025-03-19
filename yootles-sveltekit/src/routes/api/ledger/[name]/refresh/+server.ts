import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export const POST: RequestHandler = async ({ params }) => {
  try {
    // Fetch content from padm.us
    const response = await fetch(`https://padm.us/yl-${params.name}/export/txt`);
    if (!response.ok) {
      throw new Error(`Failed to fetch from padm.us: ${response.statusText}`);
    }

    const content = await response.text();
    
    // Save to snapshot file
    const filePath = join(process.cwd(), '..', 'data', `${params.name}-snapshot.txt`);
    await writeFile(filePath, content, 'utf-8');

    return json({ success: true });
  } catch (error) {
    console.error('Error refreshing ledger:', error);
    return new Response(JSON.stringify({ error: 'Failed to refresh ledger' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};