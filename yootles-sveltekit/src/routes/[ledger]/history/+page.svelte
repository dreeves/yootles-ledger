<script lang="ts">
	import { onMount } from 'svelte';
	import type { Ledger } from '$lib/types/ledger';
	import DateRangeFilter from '$lib/components/DateRangeFilter.svelte';
	import TransactionsTable from '$lib/components/TransactionsTable.svelte';
	import BalanceChart from '$lib/components/BalanceChart.svelte';
	import { parseDateFromInput } from '$lib/utils/formatting';

	export let data: { ledger: Ledger };
	let selectedAccount = '';
	let startDate: string = '';
	let endDate: string = '';
	let showPercentages = false;

	onMount(() => {
		const stored = localStorage.getItem(`selectedAccount-${data.ledger.id}`);
		if (stored && data.ledger.accounts.some((a) => a.id === stored)) {
			selectedAccount = stored;
		} else {
			selectedAccount = data.ledger.accounts[0]?.id || '';
		}
	});

	$: if (selectedAccount) {
		localStorage.setItem(`selectedAccount-${data.ledger.id}`, selectedAccount);
	}

	$: filteredTransactions = data.ledger.transactions
		.filter((tx) => !selectedAccount || tx.from === selectedAccount || tx.to === selectedAccount)
		.filter((tx) => {
			if (startDate && tx.date < parseDateFromInput(startDate)) {
				return false;
			}
			if (endDate && tx.date > parseDateFromInput(endDate)) {
				return false;
			}
			return true;
		})
		.sort((a, b) => b.date.localeCompare(a.date)); // Sort descending for display
</script>

<div class="p-4">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-xl font-semibold">Balance History</h2>
		<div class="flex gap-4">
			<select bind:value={selectedAccount} class="rounded border px-3 py-2">
				<option value="">Select Account</option>
				{#each data.ledger.accounts as account (account.id)}
					<option value={account.id}>{account.name}</option>
				{/each}
			</select>
			<a
				href="/{data.ledger.id}"
				class="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
			>
				Back to Balances
			</a>
		</div>
	</div>

	{#if !selectedAccount}
		<div class="py-8 text-center text-gray-500">Select an account to view its balance history</div>
	{:else}
		<DateRangeFilter
			bind:startDate
			bind:endDate
			bind:showInterestRate={showPercentages}
			transactions={data.ledger.transactions}
			onShowInterestRateChange={(value) => (showPercentages = value)}
		/>

		<div class="rounded-lg bg-white p-4 shadow">
			<BalanceChart ledger={data.ledger} {selectedAccount} {showPercentages} />

			{#if filteredTransactions.length === 0}
				<div class="py-8 text-center text-gray-500">
					No transactions found in the selected date range
				</div>
			{:else}
				<div class="mt-8">
					<TransactionsTable
						ledger={data.ledger}
						transactions={filteredTransactions}
						{selectedAccount}
						showBalances={true}
					/>
				</div>
			{/if}
		</div>

		<div class="mt-4 text-sm text-gray-500">
			<p>Debug Info:</p>
			<pre class="mt-1 overflow-auto rounded bg-gray-50 p-2">
        Selected Account: {selectedAccount}
        Date Range: {startDate} to {endDate}
        Transaction Count: {filteredTransactions.length}
        Interest Rate Count: {data.ledger.interestRates.length}
      </pre>
		</div>
	{/if}
</div>
