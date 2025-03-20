<script lang="ts">
	import type { Ledger } from '$lib/types/ledger';
	import { invalidate } from '$app/navigation';
	import { RotateCw } from 'lucide-svelte';

	export let data: { ledger: Ledger };
	let isRefreshing = false;
	let lastError: string | null = null;

	async function refreshBalances() {
		try {
			isRefreshing = true;
			lastError = null;

			const response = await fetch(`/api/ledger/${data.ledger.id}/refresh`, {
				method: 'POST'
			});

			if (!response.ok) {
				const errorData = await response.text();
				lastError = `Failed to refresh: ${errorData}`;
				throw new Error('Failed to refresh balances');
			}

			await invalidate(`/api/ledger/${data.ledger.id}`);
		} catch (error: unknown) {
			console.error('Error refreshing balances:', error);
			lastError = error instanceof Error ? error.message : String(error);
			alert('Failed to refresh balances. Please try again.');
		} finally {
			isRefreshing = false;
		}
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(amount);
	}

	function formatPercent(rate: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'percent',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(rate);
	}

	function calculateInterestPercent(principal: number, interest: number): string {
		if (principal === 0) return '';
		return formatPercent(interest / principal);
	}

	const currentRate =
		data.ledger.interestRates.length > 0
			? data.ledger.interestRates[data.ledger.interestRates.length - 1].rate
			: 0;
</script>

<div class="balance-display rounded-lg bg-white p-4 shadow">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h2 class="text-xl font-semibold">Current Balances</h2>
			{#if currentRate > 0}
				<p class="mt-1 text-sm text-gray-500">
					Current interest rate: {formatPercent(currentRate)}
				</p>
			{/if}
		</div>
		<div>
			<button
				class="rounded-full p-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
				on:click={refreshBalances}
				disabled={isRefreshing}
				title="Refresh Balances"
			>
				<div class:animate-spin={isRefreshing}>
					<RotateCw size={20} />
				</div>
			</button>
		</div>
	</div>

	{#if lastError}
		<div class="mb-6 rounded bg-red-100 p-3 text-red-700">
			{lastError}
		</div>
	{/if}

	<div
		class="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]"
	>
		{#each data.ledger.accounts as account}
			{@const principal = account.balance - account.interestAccrued}
			<div
				class="h-full rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300"
			>
				<div class="mb-3">
					<h3 class="font-medium break-words text-gray-900">{account.name}</h3>
					{#if account.email}
						<p class="text-sm break-words text-gray-500">{account.email}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<div class="flex items-baseline justify-between text-sm">
						<span class="text-gray-600">Principal:</span>
						<span class={principal >= 0 ? 'text-green-600' : 'text-red-600'}>
							{formatCurrency(principal)}
						</span>
					</div>

					{#if account.interestAccrued !== 0}
						<div class="flex items-baseline justify-between text-sm">
							<span class="text-gray-600">Interest:</span>
							<div class="text-right">
								<span class={account.interestAccrued >= 0 ? 'text-green-600' : 'text-red-600'}>
									{formatCurrency(account.interestAccrued)}
								</span>
								{#if principal !== 0}
									<span class="ml-1 text-xs text-gray-500">
										({calculateInterestPercent(principal, account.interestAccrued)})
									</span>
								{/if}
							</div>
						</div>
					{/if}

					<div class="mt-2 border-t border-gray-100 pt-2">
						<div class="flex items-baseline justify-between">
							<span class="font-medium text-gray-900">Total:</span>
							<span
								class={`font-medium ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}
							>
								{formatCurrency(account.balance)}
							</span>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
