<script lang="ts">
	import type { Ledger } from '$lib/types/ledger';
	import type { Socket } from 'socket.io-client';
	import { onMount } from 'svelte';

	export let data: { ledger: Ledger; error?: string };
	export let socket: Socket;

	let lastUpdate = 0;
	const DEBOUNCE_MS = 1000; // Only allow updates once per second

	onMount(() => {
		// Listen for changes and notify other users
		window.addEventListener('message', (event) => {
			if (event.origin === 'https://padm.us' && event.data.type === 'pad-changed') {
				const now = Date.now();
				if (now - lastUpdate > DEBOUNCE_MS) {
					lastUpdate = now;
					socket.emit('ledger-update', { ledgerId: data.ledger.id });
				}
			}
		});
	});
</script>

<div class="editor-container mt-6 overflow-hidden rounded-lg bg-white shadow">
	<div class="border-b p-4">
		<h2 class="text-xl font-semibold">Ledger Editor</h2>
	</div>

	{#if data.error}
		<div class="border-b bg-red-50 p-4 text-red-700">
			<p class="font-medium">Error in ledger syntax:</p>
			<p class="mt-1">{data.error}</p>
		</div>
	{/if}

	<iframe
		src="https://padm.us/yl-{data.ledger.id}"
		style="width: 100%; height: 600px; border: none;"
		title="Ledger Editor"
	></iframe>
</div>
