<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Balance from '$lib/components/Balance.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import { initSocket } from '$lib/client/socket';
  import type { Socket } from 'socket.io-client';
  
  export let data;
  let socket: Socket;
  
  onMount(() => {
    socket = initSocket(data.ledger.id);
  });

  onDestroy(() => {
    if (socket) {
      socket.disconnect();
    }
  });

  $: isEmpty = data.ledger.accounts.length === 0;
</script>

<div class="container mx-auto px-4 py-8">
  <header class="mb-8">
    <h1 class="text-3xl font-bold">{data.ledger.id} Ledger</h1>
    {#if isEmpty}
      <p class="mt-4 text-gray-600">
        This is a new ledger. Use the editor below to add accounts and transactions.
      </p>
    {/if}
  </header>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div class="lg:col-span-1">
      {#if !isEmpty}
        <Balance {data} />
      {:else}
        <div class="p-4 bg-white shadow rounded-lg">
          <h2 class="text-xl font-semibold mb-4">Getting Started</h2>
          <p class="text-gray-600">
            Click "Refresh Balances" after adding accounts and transactions to see the balances.
          </p>
        </div>
      {/if}
    </div>
    <div class="lg:col-span-2">
      <Editor {data} {socket} />
    </div>
  </div>
</div>