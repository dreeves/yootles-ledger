<script lang="ts">
  import type { Ledger } from '$lib/types/ledger';
  import { invalidate } from '$app/navigation';
  
  export let data: { ledger: Ledger };
  let isRefreshing = false;

  async function refreshBalances() {
    try {
      isRefreshing = true;
      console.log('Refreshing balances for ledger:', data.ledger.id);
      
      const response = await fetch(`/api/ledger/${data.ledger.id}/refresh`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Refresh failed:', errorData);
        throw new Error('Failed to refresh balances');
      }

      // Reload the page data using SvelteKit's invalidation
      await invalidate(`/api/ledger/${data.ledger.id}`);
    } catch (error) {
      console.error('Error refreshing balances:', error);
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
</script>

<div class="balance-display p-4 bg-white shadow rounded-lg">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-xl font-semibold">Current Balances</h2>
    <button 
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
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
</div>