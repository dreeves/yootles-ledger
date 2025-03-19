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

<div class="layout">
  <Balance {data} />
  <Editor {data} {socket} />
</div>