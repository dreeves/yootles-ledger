<script lang="ts">
  import type { Ledger } from '$lib/types/ledger';
  import { invalidate } from '$app/navigation';
  
  export let data: { ledger: Ledger };
  let isRefreshing = false;
  let lastError: string | null = null;

  async function refreshBalances() {
    try {
      isRefreshing = true;
      lastError = null;
      console.log('Refreshing balances for ledger:', data.ledger.id);
      
      const response = await fetch(`/api/ledger/${data.ledger.id}/refresh`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Refresh failed:', errorData);
        lastError = `Failed to refresh: ${errorData}`;
        throw new Error('Failed to refresh balances');
      }

      const responseData = await response.json();
      console.log('Refresh response:', responseData);

      // Reload the page data using SvelteKit's invalidation
      await invalidate(`/api/ledger/${data.ledger.id}`);
    } catch (error) {
      console.error('Error refreshing balances:', error);
      lastError = error.message;
      alert('Failed to refresh balances. Please try again.');
    } finally {
      isRefreshing = false;
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  function formatPercent(rate: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(rate);
  }
</script>

<div class="balance-display p-4 bg-white shadow rounded-lg">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-xl font-semibold">Current Balances</h2>
    <div class="space-x-2">
      <a 
        href="/{data.ledger.id}/transactions" 
        class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
      >
        View Transactions
      </a>
      <button 
        class="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        on:click={refreshBalances}
        disabled={isRefreshing}
      >
        {#if isRefreshing}
          Refreshing...
        {:else}
          Refresh Balances
        {/if}
      </button>
    </div>
  </div>

  {#if lastError}
    <div class="mb-4 p-3 bg-red-100 text-red-700 rounded">
      {lastError}
    </div>
  {/if}

  <div class="space-y-2">
    {#each data.ledger.accounts as account}
      <div class="flex justify-between items-center p-2 hover:bg-gray-50">
        <span class="font-medium">{account.name}</span>
        <span class={account.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
          {formatCurrency(account.balance)}
        </span>
      </div>
    {/each}
  </div>

  <div class="mt-4 text-sm text-gray-500">
    <p>Debug Info:</p>
    <pre class="mt-1 p-2 bg-gray-50 rounded overflow-auto">
      Accounts: {JSON.stringify(data.ledger.accounts, null, 2)}
      Interest Rates: {JSON.stringify(data.ledger.interestRates, null, 2)}
      Raw Data: {JSON.stringify(data, null, 2)}
    </pre>
  </div>
</div>