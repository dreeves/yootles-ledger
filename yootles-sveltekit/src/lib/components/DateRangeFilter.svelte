<script lang="ts">
  import { formatDateForInput } from '$lib/utils/formatting';
  
  export let startDate: string;
  export let endDate: string;
  export let showInterestRate: boolean | undefined = undefined;
  export let onShowInterestRateChange: ((value: boolean) => void) | undefined = undefined;

  // Initialize date range if not set
  export let transactions: Array<{ date: string }>;
  $: if (transactions.length > 0 && !startDate && !endDate) {
    const dates = transactions.map(tx => tx.date);
    startDate = formatDateForInput(dates.reduce((a, b) => a < b ? a : b));
    endDate = formatDateForInput(dates.reduce((a, b) => a > b ? a : b));
  }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label 
      for="start-date" 
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      Start Date
    </label>
    <input
      id="start-date"
      type="date"
      bind:value={startDate}
      class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
    />
  </div>

  <div>
    <label 
      for="end-date" 
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      End Date
    </label>
    <input
      id="end-date"
      type="date"
      bind:value={endDate}
      class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
    />
  </div>

  {#if showInterestRate !== undefined && onShowInterestRateChange}
    <div>
      <label 
        for="show-interest-rate" 
        class="block text-sm font-medium text-gray-700 mb-1"
      >
        Show Interest Rate
      </label>
      <div class="mt-1 inline-flex items-center">
        <input
          id="show-interest-rate"
          type="checkbox"
          checked={showInterestRate}
          on:change={(e) => onShowInterestRateChange(e.currentTarget.checked)}
          class="form-checkbox h-4 w-4 text-blue-600"
        >
        <span class="ml-2">Show rate over time</span>
      </div>
    </div>
  {/if}
</div>