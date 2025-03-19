<script lang="ts">
  import type { Ledger } from '$lib/types/ledger';
  import { onMount } from 'svelte';
  
  export let data: { ledger: Ledger };
  export let socket: any;

  let editorContainer: HTMLDivElement;
  
  onMount(() => {
    // Create iframe for Etherpad
    const iframe = document.createElement('iframe');
    iframe.src = `https://padm.us/p/yl-${data.ledger.id}`;
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    
    // Add iframe to container
    editorContainer.appendChild(iframe);

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
  <div bind:this={editorContainer} class="w-full"></div>
</div>