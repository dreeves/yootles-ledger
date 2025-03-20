<script lang="ts">
  import { page } from '$app/stores';
  
  $: ledgerId = $page.params.ledger;
  $: isLedgerPage = !!ledgerId;
</script>

<nav class="bg-white shadow">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between h-16">
      <div class="flex">
        <div class="flex-shrink-0 flex items-center">
          <a href="/" class="text-xl font-bold text-gray-900">Yootles</a>
        </div>
        {#if isLedgerPage}
          <div class="hidden sm:ml-6 sm:flex sm:items-center">
            <div class="text-gray-500">/</div>
            <div class="ml-3 text-gray-900 font-medium">{ledgerId}</div>
          </div>
        {/if}
      </div>
      
      {#if isLedgerPage}
        <div class="flex items-center space-x-4">
          <a 
            href="/{ledgerId}" 
            class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            class:text-gray-900={$page.url.pathname === `/${ledgerId}`}
          >
            Balances
          </a>
          <a 
            href="/{ledgerId}/history" 
            class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            class:text-gray-900={$page.url.pathname === `/${ledgerId}/history`}
          >
            History
          </a>
          <a 
            href="/{ledgerId}/transactions" 
            class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            class:text-gray-900={$page.url.pathname === `/${ledgerId}/transactions`}
          >
            Transactions
          </a>
        </div>
      {/if}
    </div>
  </div>
</nav>