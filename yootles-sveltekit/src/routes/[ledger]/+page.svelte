<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Balance from '$lib/components/Balance.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import { initSocket } from '$lib/client/socket';
	import type { Socket } from 'socket.io-client';

	export let data;
	let socket: Socket;

	onMount(() => {
		if (data.ledger.id) {
			socket = initSocket(data.ledger.id);
		}
	});

	onDestroy(() => {
		if (socket) {
			socket.disconnect();
		}
	});
</script>

<div class="container mx-auto h-[calc(100vh-8rem)] px-4">
	{#if 'error' in data && data.error}
		<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
			<p class="font-medium">Warning: Your ledger has syntax errors</p>
			<p class="mt-1">{data.error}</p>
			<p class="mt-1">Click "Refresh Balances" to check if the error has been fixed.</p>
		</div>
	{/if}

	<div class="grid h-full grid-cols-1 gap-8 lg:grid-cols-3">
		<div class="h-full overflow-auto lg:col-span-1">
			<Balance {data} />
		</div>
		<div class="h-full lg:col-span-2">
			<Editor {data} {socket} />
		</div>
	</div>
</div>
