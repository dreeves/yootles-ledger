<script lang="ts">
  import type { Ledger } from '$lib/types/ledger';
  import { formatCurrency, formatDate } from '$lib/utils/formatting';
  import { AlertTriangle } from 'lucide-svelte';

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
    const account = ledger.accounts.find((a) => a.id === accountId);
    if (!account) {
      return `${accountId} (unregistered)`;
    }
    return account.name;
  }

  function isUnregisteredAccount(accountId: string): boolean {
    return !ledger.accounts.some((a) => a.id === accountId);
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
          <th class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
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
              <div class="flex items-center gap-1">
                {#if isUnregisteredAccount(tx.from)}
                  <AlertTriangle class="h-4 w-4 text-amber-500" />
                {/if}
                {getAccountName(tx.from)}
              </div>
            </td>
            <td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
              <div class="flex items-center gap-1">
                {#if isUnregisteredAccount(tx.to)}
                  <AlertTriangle class="h-4 w-4 text-amber-500" />
                {/if}
                {getAccountName(tx.to)}
              </div>
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

  {#if transactions.some(tx => isUnregisteredAccount(tx.from) || isUnregisteredAccount(tx.to))}
    <div class="mt-4 rounded-md bg-amber-50 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <AlertTriangle class="h-5 w-5 text-amber-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-amber-800">Unregistered Accounts</h3>
          <div class="mt-2 text-sm text-amber-700">
            <p>
              Some transactions use account IDs that are not registered in the ledger. This could indicate a
              typo or a missing account definition.
            </p>
            <ul class="mt-2 list-disc pl-5 space-y-1">
              {#each [...new Set(transactions.flatMap(tx => [tx.from, tx.to]).filter(id => isUnregisteredAccount(id)))] as accountId}
                <li>
                  <code class="font-mono bg-amber-100 px-1 py-0.5 rounded">{accountId}</code>
                </li>
              {/each}
            </ul>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
