<script lang="ts">
	import type { Ledger, CombinedAccount } from '$lib/types/ledger';
	import { RotateCw } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import AccountCard from './AccountCard.svelte';

	export let data: { ledger: Ledger };
	let isRefreshing = false;
	let lastError: string | null = null;
	const dispatch = createEventDispatcher();

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

	function dateDiffInYears(fromDate: string, toDate: string): number {
		const [fromYear, fromMonth, fromDay] = fromDate.split('.').map(Number);
		const [toYear, toMonth, toDay] = toDate.split('.').map(Number);

		const from = new Date(fromYear, fromMonth - 1, fromDay);
		const to = new Date(toYear, toMonth - 1, toDay);

		return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
	}

	let allAccounts: CombinedAccount[] = [
		...data.ledger.accounts,
		...(data.ledger.unregisteredAccounts?.map((ua) => {
			// Sort all events (transactions and interest rate changes) by date
			const allEvents = [
				...data.ledger.transactions
					.filter((tx) => tx.from === ua.id || tx.to === ua.id)
					.map((tx) => ({ type: 'transaction' as const, date: tx.date, data: tx })),
				...data.ledger.interestRates.map((r) => ({ type: 'rate' as const, date: r.date, data: r }))
			].sort((a, b) => a.date.localeCompare(b.date));

			let balance = 0;
			let interestAccrued = 0;
			let currentRate = 0;
			let lastDate = '';

			// Process all events chronologically
			for (const event of allEvents) {
				// Calculate interest since last event if there's a rate
				if (lastDate && currentRate > 0) {
					const years = dateDiffInYears(lastDate, event.date);
					const interest = balance * currentRate * years;
					balance = balance * (1 + currentRate * years);
					interestAccrued += interest;
				}

				if (event.type === 'rate') {
					currentRate = event.data.rate;
				} else {
					const tx = event.data;
					if (tx.from === ua.id) {
						balance -= tx.amount;
					} else {
						balance += tx.amount;
					}
				}

				lastDate = event.date;
			}

			// Calculate final interest up to today if there's a current rate
			if (currentRate > 0 && lastDate) {
				const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
				const years = dateDiffInYears(lastDate, today);
				const interest = balance * currentRate * years;
				balance = balance * (1 + currentRate * years);
				interestAccrued += interest;
			}

			// Round to 2 decimal places
			balance = Math.round(balance * 100) / 100;
			interestAccrued = Math.round(interestAccrued * 100) / 100;

			return {
				id: ua.id,
				name: ua.id,
				email: '',
				balance,
				interestAccrued,
				isUnregistered: true,
				transactionCount: ua.usedInTransactions.length
			};
		}) ?? [])
	];

	$: {
		allAccounts = [
			...data.ledger.accounts,
			...(data.ledger.unregisteredAccounts?.map((ua) => {
				// Sort all events (transactions and interest rate changes) by date
				const allEvents = [
					...data.ledger.transactions
						.filter((tx) => tx.from === ua.id || tx.to === ua.id)
						.map((tx) => ({ type: 'transaction' as const, date: tx.date, data: tx })),
					...data.ledger.interestRates.map((r) => ({ type: 'rate' as const, date: r.date, data: r }))
				].sort((a, b) => a.date.localeCompare(b.date));

				let balance = 0;
				let interestAccrued = 0;
				let currentRate = 0;
				let lastDate = '';

				// Process all events chronologically
				for (const event of allEvents) {
					// Calculate interest since last event if there's a rate
					if (lastDate && currentRate > 0) {
						const years = dateDiffInYears(lastDate, event.date);
						const interest = balance * currentRate * years;
						balance = balance * (1 + currentRate * years);
						interestAccrued += interest;
					}

					if (event.type === 'rate') {
						currentRate = event.data.rate;
					} else {
						const tx = event.data;
						if (tx.from === ua.id) {
							balance -= tx.amount;
						} else {
							balance += tx.amount;
						}
					}

					lastDate = event.date;
				}

				// Calculate final interest up to today if there's a current rate
				if (currentRate > 0 && lastDate) {
					const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
					const years = dateDiffInYears(lastDate, today);
					const interest = balance * currentRate * years;
					balance = balance * (1 + currentRate * years);
					interestAccrued += interest;
				}

				// Round to 2 decimal places
				balance = Math.round(balance * 100) / 100;
				interestAccrued = Math.round(interestAccrued * 100) / 100;

				return {
					id: ua.id,
					name: ua.id,
					email: '',
					balance,
					interestAccrued,
					isUnregistered: true,
					transactionCount: ua.usedInTransactions.length
				};
			}) ?? [])
		];
	}
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

	{#if lastError}
		<div class="mb-3 rounded bg-red-50/80 p-2 text-sm text-red-700">
			{lastError}
		</div>
	{/if}

	<div class="grid auto-rows-fr grid-cols-1 gap-2 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
		{#each allAccounts as account (account.id)}
			<AccountCard {account} />
		{/each}
	</div>
</div>
