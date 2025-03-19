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
</script>

<div class="container mx-auto px-4 py-8">
  <header class="mb-8">
    <h1 class="text-3xl font-bold">{data.ledger.id} Ledger</h1>
  </header>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div class="lg:col-span-1">
      <Balance {data} />
    </div>
    <div class="lg:col-span-2">
      <Editor {data} {socket} />
    </div>
  </div>
</div>