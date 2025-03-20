<script lang="ts">
  import type { Ledger } from '$lib/types/ledger';
  
  export let data: { ledger: Ledger };

  let selectedAccount: string = '';
  let sortDirection: 'asc' | 'desc' = 'desc';
  let startDate: string = '';
  let endDate: string = '';

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

  function formatDateForInput(date: string): string {
    const [year, month, day] = date.split('.');
    return `${year}-${month}-${day}`;
  }

  function parseDateFromInput(date: string): string {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${year}.${month}.${day}`;
  }

  $: filteredTransactions = data.ledger.transactions.filter(tx => {
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
    sortDirection === 'desc' 
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date)
  );

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

  // Initialize date range if there are transactions
  $: if (data.ledger.transactions.length > 0 && !startDate && !endDate) {
    const dates = data.ledger.transactions.map(tx => tx.date);
    startDate = formatDateForInput(dates.reduce((a, b) => a < b ? a : b));
    endDate = formatDateForInput(dates.reduce((a, b) => a > b ? a : b));
  }
</script>

<div class="container mx-auto px-4 py-8">
  <header class="mb-8">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">{data.ledger.id} Transactions</h1>
      <a 
        href="/api/ledger/{data.ledger.id}/transactions.csv"
        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        download
      >
        Download CSV
      </a>
    </div>
    <div class="mt-4">
      <a 
        href="/{data.ledger.id}" 
        class="text-blue-500 hover:text-blue-600"
      >
        ← Back to Ledger
      </a>
    </div>
  </header>

  <div class="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Filter by Account
      </label>
      <select
        bind:value={selectedAccount}
        class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
      >
        <option value="">All Accounts</option>
        {#each data.ledger.accounts as account}
          <option value={account.id}>{account.name}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Start Date
      </label>
      <input
        type="date"
        bind:value={startDate}
        class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        End Date
      </label>
      <input
        type="date"
        bind:value={endDate}
        class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Sort Order
      </label>
      <button
        on:click={toggleSort}
        class="mt-1 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {sortDirection === 'desc' ? '↓ Newest First' : '↑ Oldest First'}
      </button>
    </div>
  </div>

  <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-sm font-medium text-gray-500">Total Transactions</h3>
      <p class="mt-1 text-2xl font-semibold text-gray-900">{statistics.count}</p>
    </div>
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-sm font-medium text-gray-500">Total Amount</h3>
      <p class="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(statistics.totalAmount)}</p>
    </div>
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-sm font-medium text-gray-500">Average Amount</h3>
      <p class="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(statistics.averageAmount)}</p>
    </div>
  </div>

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
          {#each sortedTransactions as tx}
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
          {#if sortedTransactions.length === 0}
            <tr>
              <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                {selectedAccount 
                  ? "No transactions found for selected account" 
                  : "No transactions found"}
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>