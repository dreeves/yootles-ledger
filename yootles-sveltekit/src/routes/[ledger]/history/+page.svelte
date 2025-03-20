<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import type { Ledger } from '$lib/types/ledger';
  
  export let data: { ledger: Ledger };
  let selectedAccount = '';
  let chartCanvas: HTMLCanvasElement;
  let chart: Chart | null = null;
  let startDate: string = '';
  let endDate: string = '';
  let showPercentages = false;

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

  function formatDate(date: string): string {
    const [year, month, day] = date.split('.');
    return new Date(+year, +month - 1, +day).toLocaleDateString();
  }

  function formatDateForInput(date: string): string {
    const [year, month, day] = date.split('.');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  function parseDateFromInput(date: string): string {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${year}.${month}.${day}`;
  }

  $: filteredTransactions = data.ledger.transactions
    .filter(tx => !selectedAccount || tx.from === selectedAccount || tx.to === selectedAccount)
    .filter(tx => {
      if (startDate && tx.date < parseDateFromInput(startDate)) {
        return false;
      }
      if (endDate && tx.date > parseDateFromInput(endDate)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  $: sortedInterestRates = [...data.ledger.interestRates].sort((a, b) => 
    b.date.localeCompare(a.date)
  );

  $: currentRate = sortedInterestRates[0]?.rate ?? 0;

  $: if (chartCanvas && selectedAccount) {
    console.log('Updating chart for account:', selectedAccount);
    console.log('Canvas element:', chartCanvas);
    
    const ctx = chartCanvas.getContext('2d');
    if (ctx) {
      try {
        console.log('Got 2D context:', ctx);

        // Destroy existing chart only if we're about to create a new one
        if (chart) {
          console.log('Destroying existing chart before creating new one');
          chart.destroy();
          chart = null;
        }
        
        // Calculate running balances
        const balances = new Map<string, number>();
        const interestAccrued = new Map<string, number>();
        let currentRate = 0;
        let lastDate = '';

        // Initialize balances for all accounts
        data.ledger.accounts.forEach(account => {
          balances.set(account.id, 0);
          interestAccrued.set(account.id, 0);
        });

        // Combine transactions and interest rate changes
        const allEvents = [
          ...data.ledger.transactions.map(t => ({ type: 'transaction' as const, date: t.date, data: t })),
          ...data.ledger.interestRates.map(r => ({ type: 'rate' as const, date: r.date, data: r }))
        ].sort((a, b) => a.date.localeCompare(b.date));

        console.log('All events:', allEvents);

        // Calculate balances at each point
        const timePoints = [];
        const principalPoints = [];
        const interestPoints = [];
        const totalPoints = [];
        const ratePoints = [];

        for (const event of allEvents) {
          // Apply interest since last event
          if (lastDate && currentRate > 0) {
            const [fromYear, fromMonth, fromDay] = lastDate.split('.').map(Number);
            const [toYear, toMonth, toDay] = event.date.split('.').map(Number);
            const from = new Date(fromYear, fromMonth - 1, fromDay);
            const to = new Date(toYear, toMonth - 1, toDay);
            const years = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

            if (selectedAccount) {
              const balance = balances.get(selectedAccount)!;
              const interest = balance * currentRate * years;
              balances.set(selectedAccount, balance * (1 + currentRate * years));
              interestAccrued.set(selectedAccount, interestAccrued.get(selectedAccount)! + interest);
            }
          }

          if (event.type === 'rate') {
            currentRate = event.data.rate;
            console.log('Interest rate change:', { date: event.date, rate: currentRate });
          } else {
            const tx = event.data;
            if (tx.from === selectedAccount) {
              balances.set(tx.from, balances.get(tx.from)! - tx.amount);
              console.log('Debit:', { date: tx.date, amount: tx.amount, balance: balances.get(tx.from) });
            }
            if (tx.to === selectedAccount) {
              balances.set(tx.to, balances.get(tx.to)! + tx.amount);
              console.log('Credit:', { date: tx.date, amount: tx.amount, balance: balances.get(tx.to) });
            }
          }

          lastDate = event.date;

          if (selectedAccount) {
            const principal = balances.get(selectedAccount)! - interestAccrued.get(selectedAccount)!;
            const interest = interestAccrued.get(selectedAccount)!;
            const total = balances.get(selectedAccount)!;

            timePoints.push(formatDate(event.date));
            principalPoints.push(principal);
            interestPoints.push(interest);
            totalPoints.push(total);
            ratePoints.push(currentRate);

            console.log('Point:', { 
              date: event.date, 
              principal, 
              interest, 
              total, 
              rate: currentRate 
            });
          }
        }

        console.log('Creating chart with data:', {
          timePoints,
          principalPoints,
          interestPoints,
          totalPoints,
          ratePoints
        });

        if (timePoints.length > 0) {
          try {
            chart = new Chart(ctx, {
              type: 'line',
              data: {
                labels: timePoints,
                datasets: [
                  {
                    label: 'Principal',
                    data: principalPoints,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    yAxisID: 'y'
                  },
                  {
                    label: 'Interest',
                    data: interestPoints,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    yAxisID: 'y'
                  },
                  {
                    label: 'Total',
                    data: totalPoints,
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    yAxisID: 'y'
                  },
                  {
                    label: 'Interest Rate',
                    data: ratePoints,
                    borderColor: 'rgb(244, 63, 94)',
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    yAxisID: 'rate',
                    hidden: !showPercentages
                  }
                ]
              },
              options: {
                maintainAspectRatio: false,
                responsive: true,
                interaction: {
                  intersect: false,
                  mode: 'index'
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        if (context.dataset.yAxisID === 'rate') {
                          return `${context.dataset.label}: ${formatPercent(context.parsed.y)}`;
                        }
                        return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                      callback: (value) => formatCurrency(value as number)
                    }
                  },
                  rate: {
                    type: 'linear',
                    display: showPercentages,
                    position: 'right',
                    ticks: {
                      callback: (value) => formatPercent(value as number)
                    },
                    grid: {
                      drawOnChartArea: false
                    }
                  }
                }
              }
            });
            console.log('Chart created successfully:', chart);
          } catch (error) {
            console.error('Error creating chart:', error);
            chart = null;
          }
        } else {
          console.warn('No data points to display');
          chart = null;
        }
      } catch (error) {
        console.error('Error in chart initialization:', error);
        chart = null;
      }
    } else {
      console.error('Failed to get 2D context from canvas');
      chart = null;
    }
  }

  // Initialize date range if there are transactions
  $: if (data.ledger.transactions.length > 0 && !startDate && !endDate) {
    const dates = data.ledger.transactions.map(tx => tx.date);
    startDate = formatDateForInput(dates.reduce((a, b) => a < b ? a : b));
    endDate = formatDateForInput(dates.reduce((a, b) => a > b ? a : b));
  }

  onDestroy(() => {
    if (chart) {
      console.log('Cleaning up chart on component destruction');
      chart.destroy();
      chart = null;
    }
  });
</script>

<div class="p-4">
  <div class="mb-4 flex justify-between items-center">
    <h2 class="text-xl font-semibold">Balance History</h2>
    <div class="flex gap-4">
      <select
        bind:value={selectedAccount}
        class="px-3 py-2 border rounded"
      >
        <option value="">Select Account</option>
        {#each data.ledger.accounts as account}
          <option value={account.id}>{account.name}</option>
        {/each}
      </select>
      <a 
        href="/{data.ledger.id}" 
        class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
      >
        Back to Balances
      </a>
    </div>
  </div>

  {#if !selectedAccount}
    <div class="text-center py-8 text-gray-500">
      Select an account to view its balance history
    </div>
  {:else}
    <div class="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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
          Show Interest Rate
        </label>
        <label class="mt-1 inline-flex items-center">
          <input
            type="checkbox"
            bind:checked={showPercentages}
            class="form-checkbox h-4 w-4 text-blue-600"
          >
          <span class="ml-2">Show rate over time</span>
        </label>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-4">
      <div style="height: 400px; position: relative; width: 100%;">
        <canvas bind:this={chartCanvas} style="width: 100%; height: 100%;"></canvas>
      </div>

      {#if filteredTransactions.length === 0}
        <div class="text-center py-8 text-gray-500">
          No transactions found in the selected date range
        </div>
      {:else}
        <div class="mt-8 overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each filteredTransactions as tx}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(tx.date)}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tx.from === selectedAccount ? 'Debit' : 'Credit'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(tx.from === selectedAccount ? -tx.amount : tx.amount)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {currentRate > 0 ? formatPercent(currentRate) : '-'}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">{tx.description}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <div class="mt-4 text-sm text-gray-500">
      <p>Debug Info:</p>
      <pre class="mt-1 p-2 bg-gray-50 rounded overflow-auto">
        Selected Account: {selectedAccount}
        Date Range: {startDate} to {endDate}
        Transaction Count: {filteredTransactions.length}
        Interest Rate Count: {data.ledger.interestRates.length}
        Chart Instance: {chart ? 'Created' : 'Not Created'}
        Canvas Element: {chartCanvas ? 'Bound' : 'Not Bound'}
      </pre>
    </div>
  {/if}
</div>