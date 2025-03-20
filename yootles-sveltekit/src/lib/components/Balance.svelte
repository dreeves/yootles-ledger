<script lang="ts">
	import type { Ledger } from '$lib/types/ledger';
	import { RotateCw } from 'lucide-svelte';
	import { AlertTriangle } from 'lucide-svelte';

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

			// Force a full page reload to ensure we get fresh data
			window.location.reload();
		} catch (error) {
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

<div class="balance-display h-full overflow-auto rounded-lg bg-custom-primary p-3 shadow-sm">
	<div class="sticky top-0 z-10 mb-3 flex items-center justify-between bg-custom-primary">
		<div>
			<h2 class="text-lg font-medium text-gray-700">Current Balances</h2>
			{#if currentRate > 0}
				<p class="mt-0.5 text-sm text-gray-500">
					Current interest rate: {formatPercent(currentRate)}
				</p>
			{/if}
		</div>
		<div>
			<button
				class="rounded-full p-2 text-gray-500 transition-colors hover:bg-custom-secondary hover:text-gray-700 disabled:opacity-50"
				on:click={refreshBalances}
				disabled={isRefreshing}
				title="Refresh Balances"
			>
				<div class:animate-spin={isRefreshing}>
					<RotateCw size={18} />
				</div>
			</button>
		</div>
	</div>

	{#if data.ledger.unregisteredAccounts?.length > 0}
		<div class="mb-3 rounded-md bg-amber-50/80 p-3">
			<div class="flex">
				<div class="flex-shrink-0">
					<AlertTriangle class="h-4 w-4 text-amber-400" />
				</div>
				<div class="ml-2">
					<h3 class="text-sm font-medium text-amber-800">Unregistered Accounts Found</h3>
					<div class="mt-1 text-sm text-amber-700">
						<p class="text-xs">The following account IDs are used in transactions but not registered:</p>
						<ul class="mt-1 space-y-0.5 text-xs">
							{#each data.ledger.unregisteredAccounts as account (account.id)}
								<li>
									<code class="font-mono bg-amber-100/80 px-1 rounded">{account.id}</code>
									<span class="text-xs">
										({account.usedInTransactions.length} transaction{account.usedInTransactions.length === 1 ? '' : 's'})
									</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if lastError}
		<div class="mb-3 rounded bg-red-50/80 p-2 text-sm text-red-700">
			{lastError}
		</div>
	{/if}

	<div class="grid auto-rows-fr grid-cols-1 gap-2 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
		{#each data.ledger.accounts as account (account.id)}
			{@const balance = account.balance ?? 0}
			{@const interestAccrued = account.interestAccrued ?? 0}
			{@const principal = balance - interestAccrued}
			<div
				class="rounded-lg border border-gray-200 bg-white/80 p-2.5 transition-colors hover:border-gray-300"
			>
				<div class="mb-1.5">
					<h3 class="font-medium break-words text-gray-700">{account.name}</h3>
					{#if account.email}
						<p class="text-xs break-words text-gray-500">{account.email}</p>
					{/if}
				</div>

				<div class="space-y-1">
					<div class="flex items-baseline justify-between text-sm">
						<span class="text-gray-500">Principal:</span>
						<span class={principal >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
							{formatCurrency(principal)}
						</span>
					</div>

					{#if interestAccrued !== 0}
						<div class="flex items-baseline justify-between text-sm">
							<span class="text-gray-500">Interest:</span>
							<div class="text-right">
								<span class={interestAccrued >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
									{formatCurrency(interestAccrued)}
								</span>
								{#if principal !== 0}
									<span class="ml-1 text-xs text-gray-400">
										({calculateInterestPercent(principal, interestAccrued)})
									</span>
								{/if}
							</div>
						</div>
					{/if}

					<div class="mt-1 border-t border-gray-100 pt-1">
						<div class="flex items-baseline justify-between">
							<span class="font-medium text-gray-600">Total:</span>
							<span class={`font-medium ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
								{formatCurrency(balance)}
							</span>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
