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
      
      const response = await fetch(`/api/ledger/${data.ledger.id}/refresh`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        lastError = `Failed to refresh: ${errorData}`;
        throw new Error('Failed to refresh balances');
      }

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

  const currentRate = data.ledger.interestRates.length > 0 
    ? data.ledger.interestRates[data.ledger.interestRates.length - 1].rate 
    : 0;
</script>

<div class="balance-display p-4 bg-white shadow rounded-lg">
  <div class="flex justify-between items-center mb-6">
    <div>
      <h2 class="text-xl font-semibold">Current Balances</h2>
      {#if currentRate > 0}
        <p class="text-sm text-gray-500 mt-1">
          Current interest rate: {formatPercent(currentRate)}
        </p>
      {/if}
    </div>
    <div class="flex gap-2">
      <a 
        href="/{data.ledger.id}/history" 
        class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
      >
        View History
      </a>
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
    <div class="mb-6 p-3 bg-red-100 text-red-700 rounded">
      {lastError}
    </div>
  {/if}

  <div class="grid gap-4 grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] auto-rows-fr">
    {#each data.ledger.accounts as account}
      {@const principal = account.balance - account.interestAccrued}
      <div class="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors h-full">
        <div class="mb-3">
          <h3 class="font-medium text-gray-900 break-words">{account.name}</h3>
          {#if account.email}
            <p class="text-sm text-gray-500 break-words">{account.email}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <div class="flex justify-between items-baseline text-sm">
            <span class="text-gray-600">Principal:</span>
            <span class={principal >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(principal)}
            </span>
          </div>

          {#if account.interestAccrued !== 0}
            <div class="flex justify-between items-baseline text-sm">
              <span class="text-gray-600">Interest:</span>
              <div class="text-right">
                <span class={account.interestAccrued >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(account.interestAccrued)}
                </span>
                {#if principal !== 0}
                  <span class="text-xs text-gray-500 ml-1">
                    ({calculateInterestPercent(principal, account.interestAccrued)})
                  </span>
                {/if}
              </div>
            </div>
          {/if}

          <div class="pt-2 mt-2 border-t border-gray-100">
            <div class="flex justify-between items-baseline">
              <span class="font-medium text-gray-900">Total:</span>
              <span class={`font-medium ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(account.balance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>