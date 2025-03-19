<script lang="ts">
  import type { Ledger } from '$lib/types/ledger';
  
  export let data: { ledger: Ledger };

  function calculateBalance(ledger: Ledger, accountId: string): number {
    return ledger.transactions.reduce((balance, tx) => {
      if (tx.from === accountId) return balance - tx.amount;
      if (tx.to === accountId) return balance + tx.amount;
      return balance;
    }, 0);
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
</script>

<div class="balance-display p-4 bg-white shadow rounded-lg">
  <h2 class="text-xl font-semibold mb-4">Current Balances</h2>
  <div class="space-y-2">
    {#each data.ledger.accounts as account}
      {@const balance = calculateBalance(data.ledger, account.id)}
      <div class="flex justify-between items-center p-2 hover:bg-gray-50">
        <span class="font-medium">{account.name}</span>
        <span class={balance >= 0 ? 'text-green-600' : 'text-red-600'}>
          {formatCurrency(balance)}
        </span>
      </div>
    {/each}
  </div>
</div>