<script lang="ts">
  import type { Ledger } from '$lib/types/ledger';
  import { invalidate } from '$app/navigation';
  
  export let data: { ledger: Ledger };

  async function refreshBalances() {
    try {
      const response = await fetch(`/api/ledger/${data.ledger.id}/refresh`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh balances');
      }

      // Reload the page data
      await invalidate(`/api/ledger/${data.ledger.id}`);
    } catch (error) {
      console.error('Error refreshing balances:', error);
      alert('Failed to refresh balances. Please try again.');
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
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      on:click={refreshBalances}
    >
      Refresh Balances
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