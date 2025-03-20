<script lang="ts">
	import { page } from '$app/stores';

	$: ledgerId = $page.params.ledger;
	$: isLedgerPage = !!ledgerId;
</script>

<nav class="bg-white shadow">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 justify-between">
			<div class="flex">
				<div class="flex flex-shrink-0 items-center">
					<a href="/" class="text-xl font-bold text-gray-900">Yootles</a>
				</div>
				{#if isLedgerPage}
					<div class="hidden sm:ml-6 sm:flex sm:items-center">
						<div class="text-gray-500">/</div>
						<div class="ml-3 font-medium text-gray-900">{ledgerId}</div>
					</div>
				{/if}
			</div>

			{#if isLedgerPage}
				<div class="flex items-center space-x-4">
					<a
						href="/{ledgerId}"
						class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
						class:text-gray-900={$page.url.pathname === `/${ledgerId}`}
					>
						Balances
					</a>
					<a
						href="/{ledgerId}/history"
						class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
						class:text-gray-900={$page.url.pathname === `/${ledgerId}/history`}
					>
						History
					</a>
					<a
						href="/{ledgerId}/transactions"
						class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
						class:text-gray-900={$page.url.pathname === `/${ledgerId}/transactions`}
					>
						Transactions
					</a>
				</div>
			{/if}
		</div>
	</div>
</nav>
