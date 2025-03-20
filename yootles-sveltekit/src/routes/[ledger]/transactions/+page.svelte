<script lang="ts">
	import type { Ledger } from '$lib/types/ledger';
	import DateRangeFilter from '$lib/components/DateRangeFilter.svelte';
	import {
		formatCurrency,
		formatPercent,
		formatDate,
		parseDateFromInput
	} from '$lib/utils/formatting';

	export let data: { ledger: Ledger };

	let selectedAccount: string = '';
	let sortDirection: 'asc' | 'desc' = 'desc';
	let startDate: string = '';
	let endDate: string = '';

	$: filteredTransactions = data.ledger.transactions.filter((tx) => {
		if (selectedAccount && tx.from !== selectedAccount && tx.to !== selectedAccount) {
			return false;
		}
		if (startDate && tx.date < parseDateFromInput(startDate)) {
			return false;
		}
		if (endDate && tx.date > parseDateFromInput(endDate)) {
			return false;
		}
		return true;
	});

	$: sortedTransactions = [...filteredTransactions].sort((a, b) =>
		sortDirection === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
	);

	$: sortedInterestRates = [...data.ledger.interestRates].sort((a, b) =>
		b.date.localeCompare(a.date)
	);

	$: currentRate = sortedInterestRates[0]?.rate ?? 0;

	$: statistics = {
		totalAmount: filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0),
		count: filteredTransactions.length,
		averageAmount: filteredTransactions.length
			? filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0) / filteredTransactions.length
			: 0
	};

	function toggleSort() {
		sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
	}
</script>

<div class="container mx-auto px-4 py-8">
	<header class="mb-8">
		<div class="flex items-center justify-between">
			<h1 class="text-3xl font-bold">{data.ledger.id} Transactions</h1>
			<a
				href="/api/ledger/{data.ledger.id}/transactions.csv"
				class="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
				download
			>
				Download CSV
			</a>
		</div>
		<div class="mt-4">
			<a href="/{data.ledger.id}" class="text-blue-500 hover:text-blue-600"> ← Back to Ledger </a>
		</div>
	</header>

	<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
		<div>
			<label for="account-filter" class="mb-1 block text-sm font-medium text-gray-700">
				Filter by Account
			</label>
			<select
				id="account-filter"
				bind:value={selectedAccount}
				class="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
			>
				<option value="">All Accounts</option>
				{#each data.ledger.accounts as account}
					<option value={account.id}>{account.name}</option>
				{/each}
			</select>
		</div>

		<DateRangeFilter bind:startDate bind:endDate transactions={data.ledger.transactions} />

		<div>
			<label for="sort-order" class="mb-1 block text-sm font-medium text-gray-700">
				Sort Order
			</label>
			<button
				id="sort-order"
				on:click={toggleSort}
				class="mt-1 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
			>
				{sortDirection === 'desc' ? '↓ Newest First' : '↑ Oldest First'}
			</button>
		</div>
	</div>

	<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
		<div class="rounded-lg bg-white p-4 shadow">
			<h3 class="text-sm font-medium text-gray-500">Total Transactions</h3>
			<p class="mt-1 text-2xl font-semibold text-gray-900">{statistics.count}</p>
		</div>
		<div class="rounded-lg bg-white p-4 shadow">
			<h3 class="text-sm font-medium text-gray-500">Total Amount</h3>
			<p class="mt-1 text-2xl font-semibold text-gray-900">
				{formatCurrency(statistics.totalAmount)}
			</p>
		</div>
		<div class="rounded-lg bg-white p-4 shadow">
			<h3 class="text-sm font-medium text-gray-500">Average Amount</h3>
			<p class="mt-1 text-2xl font-semibold text-gray-900">
				{formatCurrency(statistics.averageAmount)}
			</p>
		</div>
		<div class="rounded-lg bg-white p-4 shadow">
			<h3 class="text-sm font-medium text-gray-500">Current Interest Rate</h3>
			<p class="mt-1 text-2xl font-semibold text-gray-900">{formatPercent(currentRate)}</p>
		</div>
	</div>

	{#if data.ledger.interestRates.length > 0}
		<div class="mb-6 overflow-hidden rounded-lg bg-white shadow">
			<div class="px-4 py-5 sm:px-6">
				<h3 class="text-lg leading-6 font-medium text-gray-900">Interest Rate History</h3>
			</div>
			<div class="border-t border-gray-200">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Date
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Rate
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each sortedInterestRates as rate}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
										{formatDate(rate.date)}
									</td>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
										{formatPercent(rate.rate)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}

	<div class="overflow-hidden rounded-lg bg-white shadow">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Date
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							From
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							To
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Amount
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Description
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each sortedTransactions as tx}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
								{formatDate(tx.date)}
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
								{data.ledger.accounts.find((a) => a.id === tx.from)?.name || tx.from}
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
								{data.ledger.accounts.find((a) => a.id === tx.to)?.name || tx.to}
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
								{formatCurrency(tx.amount)}
							</td>
							<td class="px-6 py-4 text-sm text-gray-500">
								{tx.description}
							</td>
						</tr>
					{/each}
					{#if sortedTransactions.length === 0}
						<tr>
							<td colspan="5" class="px-6 py-4 text-center text-gray-500">
								{selectedAccount
									? 'No transactions found for selected account'
									: 'No transactions found'}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
