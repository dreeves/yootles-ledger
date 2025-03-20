<script lang="ts">
	import type { Ledger } from '$lib/types/ledger';
	import { formatCurrency, formatDate } from '$lib/utils/formatting';

	export let ledger: Ledger;
	export let transactions: Array<{
		date: string;
		from: string;
		to: string;
		amount: number;
		description: string;
	}>;
	export let selectedAccount: string | undefined = undefined;
	export let showBalances = false;

	$: chronologicalTransactions = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

	function getAccountName(accountId: string): string {
		return ledger.accounts.find((a) => a.id === accountId)?.name || accountId;
	}

	function calculateRunningBalance(tx: (typeof transactions)[0]): number | undefined {
		if (!selectedAccount || !showBalances) return undefined;

		const index = chronologicalTransactions.indexOf(tx);
		const previousTransactions = chronologicalTransactions.slice(0, index + 1);

		return previousTransactions.reduce((sum, t) => {
			if (t.from === selectedAccount) return sum - t.amount;
			if (t.to === selectedAccount) return sum + t.amount;
			return sum;
		}, 0);
	}
</script>

<div class="overflow-x-auto">
	<table class="min-w-full divide-y divide-gray-200">
		<thead class="bg-gray-50">
			<tr>
				<th class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
					Date
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
					From
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
					To
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
					Amount
				</th>
				{#if showBalances}
					<th
						class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
					>
						Balance
					</th>
				{/if}
				<th class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
					Description
				</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-gray-200 bg-white">
			{#if transactions.length === 0}
				<tr>
					<td colspan={showBalances ? 6 : 5} class="px-6 py-4 text-center text-gray-500">
						{selectedAccount
							? 'No transactions found for selected account'
							: 'No transactions found'}
					</td>
				</tr>
			{:else}
				{#each transactions as tx (tx.date + tx.from + tx.to + tx.amount)}
					<tr class="hover:bg-gray-50">
						<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
							{formatDate(tx.date)}
						</td>
						<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
							{getAccountName(tx.from)}
						</td>
						<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
							{getAccountName(tx.to)}
						</td>
						<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
							{formatCurrency(tx.amount)}
						</td>
						{#if showBalances}
							{@const balance = calculateRunningBalance(tx)}
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
								{balance !== undefined ? formatCurrency(balance) : '-'}
							</td>
						{/if}
						<td class="px-6 py-4 text-sm text-gray-500">
							{tx.description}
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
