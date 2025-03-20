<script lang="ts">
	import type { CombinedAccount } from '$lib/types/ledger';
	import { formatCurrency, formatPercent } from '$lib/utils/formatting';

	export let account: CombinedAccount;

	$: balance = account.balance ?? 0;
	$: interestAccrued = account.interestAccrued ?? 0;
	$: principal = balance - interestAccrued;
	$: isUnregistered = 'isUnregistered' in account;

	function calculateInterestPercent(principal: number, interest: number): string {
		if (principal === 0) return '';
		return formatPercent(interest / principal);
	}

	$: prettyName = isUnregistered ? `Unregistered Account ${account.id}` : account.name;
</script>

<div
	class="rounded-lg p-2.5 transition-colors {isUnregistered ? 'bg-amber-50/80 border-amber-200' : 'bg-white/80 border-gray-200 hover:border-gray-300'} border"
>
	<div class="mb-1.5">
		<div class="flex justify-between items-baseline">
			<h3 class="font-medium break-words text-gray-700">
				{prettyName}
			</h3>
			<span class="text-sm text-gray-500 font-mono">
				{account.id}
			</span>
		</div>
		{#if account.email}
			<p class="text-xs break-words text-gray-500">{account.email}</p>
		{/if}
		{#if isUnregistered}
			<p class="text-xs text-amber-600 mt-0.5">
				Used in {account.transactionCount} transaction{account.transactionCount === 1 ? '' : 's'}
			</p>
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