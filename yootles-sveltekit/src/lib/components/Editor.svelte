<script lang="ts">
  import type { Ledger } from '$lib/types/ledger';
  import { onMount } from 'svelte';
  
  export let data: { ledger: Ledger };
  export let socket: any;

  onMount(() => {
    // Listen for changes and notify other users
    window.addEventListener('message', (event) => {
      if (event.origin === 'https://padm.us' && event.data.type === 'pad-changed') {
        socket.emit('ledger-update', { ledgerId: data.ledger.id });
      }
    });
  });
</script>

<div class="editor-container mt-6 bg-white shadow rounded-lg overflow-hidden">
  <div class="p-4 border-b">
    <h2 class="text-xl font-semibold">Ledger Editor</h2>
  </div>
  <iframe 
    src="https://padm.us/yl-{data.ledger.id}"
    style="width: 100%; height: 600px; border: none;"
    title="Ledger Editor"
    crossorigin="use-credentials"
  ></iframe>
</div>