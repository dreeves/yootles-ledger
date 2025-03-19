<script lang="ts">
  import type { Ledger } from '$lib/types/ledger';
  
  export let data: { ledger: Ledger };

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  function formatDate(date: string): string {
    const [year, month, day] = date.split('.');
    return new Date(+year, +month - 1, +day).toLocaleDateString();
  }
</script>

<div class="container mx-auto px-4 py-8">
  <header class="mb-8">
    <h1 class="text-3xl font-bold">{data.ledger.id} Transactions</h1>
    <div class="mt-4">
      <a 
        href="/{data.ledger.id}" 
        class="text-blue-500 hover:text-blue-600"
      >
        ← Back to Ledger
      </a>
    </div>
  </header>

  <div class="bg-white shadow rounded-lg overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              From
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              To
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each data.ledger.transactions as tx}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(tx.date)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {data.ledger.accounts.find(a => a.id === tx.from)?.name || tx.from}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {data.ledger.accounts.find(a => a.id === tx.to)?.name || tx.to}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(tx.amount)}
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {tx.description}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>