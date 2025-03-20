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

	$: isEmpty = data.ledger.accounts.length === 0;
</script>

<div class="container mx-auto px-4">
	{#if isEmpty}
		<p class="mt-4 text-gray-600">
			This is a new ledger. Use the editor below to add accounts and transactions.
		</p>
	{/if}

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
		<div class="lg:col-span-1">
			{#if !isEmpty}
				<Balance {data} />
			{:else}
				<div class="rounded-lg bg-white p-4 shadow">
					<h2 class="mb-4 text-xl font-semibold">Getting Started</h2>
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
