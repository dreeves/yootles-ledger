# Migration Plan: PHP Stack to SvelteKit

## Phase 1: Project Setup

### 1.1 Initial Setup
```bash
# Create new SvelteKit project with TypeScript
npm create svelte@latest yootles-sveltekit
cd yootles-sveltekit
npm install

# Add key dependencies
npm install @sveltejs/adapter-node
npm install socket.io-client
```

### 1.2 Project Structure
```
src/
├── lib/
│   ├── server/
│   │   └── ledger.ts       # Ledger processing logic
│   ├── components/
│   │   ├── Balance.svelte  # Balance display
│   │   └── Editor.svelte   # Etherpad wrapper
│   └── types/
│       └── ledger.ts       # TypeScript interfaces
├── routes/
│   ├── +layout.svelte
│   ├── +page.svelte        # Home page
│   ├── [ledger]/
│   │   ├── +page.svelte    # Ledger view
│   │   └── +page.server.ts # Server-side logic
│   └── api/
│       └── [...]/+server.ts # API endpoints
```

## Phase 2: Core Components

### 2.1 TypeScript Interfaces
```typescript
// src/lib/types/ledger.ts
interface Account {
  id: string;
  name: string;
  email: string;
}

interface Transaction {
  amount: number;
  from: string;
  to: string;
  date: string;
  description: string;
}

interface Ledger {
  accounts: Account[];
  transactions: Transaction[];
  interestRates: Array<{
    date: string;
    rate: number;
  }>;
}
```

### 2.2 API Endpoints
```typescript
// src/routes/api/ledger/[name]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const ledger = await loadLedger(params.name);
  return json(ledger);
};

export const POST: RequestHandler = async ({ params, request }) => {
  const data = await request.json();
  await saveLedger(params.name, data);
  return json({ success: true });
};
```

### 2.3 Real-time Updates
```typescript
// src/lib/server/socket.ts
import { Server } from 'socket.io';

export function setupWebSocket(server) {
  const io = new Server(server);
  
  io.on('connection', (socket) => {
    socket.on('join-ledger', (ledgerId) => {
      socket.join(ledgerId);
    });
    
    socket.on('ledger-update', (data) => {
      io.to(data.ledgerId).emit('refresh');
    });
  });
}
```

## Phase 3: UI Components

### 3.1 Ledger Page
```svelte
<!-- src/routes/[ledger]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Balance from '$lib/components/Balance.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import { initSocket } from '$lib/client/socket';
  
  export let data;
  let socket;
  
  onMount(() => {
    socket = initSocket(data.ledgerId);
    return () => socket.disconnect();
  });
</script>

<div class="layout">
  <Balance {data} />
  <Editor {data} {socket} />
</div>
```

### 3.2 Etherpad Integration
```svelte
<!-- src/lib/components/Editor.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  
  export let ledgerId: string;
  
  onMount(() => {
    const pad = new EtherpadLite({
      padId: `yl-${ledgerId}`,
      host: 'https://padm.us',
      showControls: false
    });
    
    return () => pad.destroy();
  });
</script>

<div class="editor-container">
  <div id="etherpad-container"></div>
</div>
```

## Phase 4: Data Migration

### 4.1 Data Access Layer
```typescript
// src/lib/server/db.ts
import { readFile, writeFile } from 'fs/promises';

export class LedgerStore {
  async getLedger(name: string): Promise<Ledger> {
    const content = await readFile(`data/${name}-snapshot.txt`, 'utf-8');
    return this.parseLedger(content);
  }
  
  async saveLedger(name: string, ledger: Ledger): Promise<void> {
    const content = this.formatLedger(ledger);
    await writeFile(`data/${name}-snapshot.txt`, content);
  }
}
```

### 4.2 Migration Script
```typescript
// scripts/migrate-data.ts
import { glob } from 'glob';
import { LedgerStore } from '../src/lib/server/db';

async function migrateData() {
  const files = await glob('data/*-snapshot.txt');
  const store = new LedgerStore();
  
  for (const file of files) {
    const ledger = await store.getLedger(file);
    await store.saveLedger(file, ledger);
  }
}
```

## Phase 5: Testing and Deployment

### 5.1 Test Setup
```typescript
// src/routes/[ledger]/+page.server.test.ts
import { describe, it, expect } from 'vitest';
import { load } from './+page.server';

describe('Ledger page', () => {
  it('loads ledger data', async () => {
    const result = await load({ params: { ledger: 'test' } });
    expect(result.ledger).toBeDefined();
  });
});
```

### 5.2 Deployment Configuration
```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: true
    })
  }
};
```

## Phase 6: Rollout Strategy

### 6.1 Parallel Operation
1. Deploy SvelteKit app to subdomain (new.yootles.com)
2. Run both systems simultaneously
3. Add banner to PHP site about new version
4. Monitor usage and errors

### 6.2 Gradual Migration
1. Start with read-only access in SvelteKit
2. Enable writes for test ledgers
3. Allow users to opt-in to new version
4. Gradually increase opt-in percentage
5. Full cutover when stable

## Phase 7: Cleanup

### 7.1 Code Cleanup
- Remove PHP codebase
- Update DNS records
- Archive old data formats
- Update documentation

### 7.2 Performance Optimization
- Implement caching
- Optimize API responses
- Add performance monitoring
- Configure CDN

## Timeline
- Phase 1-2: 2 weeks
- Phase 3: 2 weeks
- Phase 4: 1 week
- Phase 5: 2 weeks
- Phase 6: 3 weeks
- Phase 7: 1 week

Total estimated time: 11 weeks

## Rollback Plan
- Keep PHP system running in parallel
- Maintain data compatibility
- Document rollback procedures
- Monitor error rates for trigger conditions