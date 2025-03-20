<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { Ledger } from '$lib/types/ledger';
	import DateRangeFilter from '$lib/components/DateRangeFilter.svelte';
	import {
		formatCurrency,
		formatPercent,
		formatDate,
		parseDateFromInput,
		formatDateForInput
	} from '$lib/utils/formatting';

	export let data: { ledger: Ledger };
	let selectedAccount = '';
	let chartCanvas: HTMLCanvasElement;
	let chart: Chart | null = null;
	let startDate: string = '';
	let endDate: string = '';
	let showPercentages = false;
	let isCalculating = false;

	onMount(() => {
		const stored = localStorage.getItem(`selectedAccount-${data.ledger.id}`);
		if (stored && data.ledger.accounts.some((a) => a.id === stored)) {
			selectedAccount = stored;
		} else {
			selectedAccount = data.ledger.accounts[0]?.id || '';
		}
	});

	$: if (selectedAccount) {
		localStorage.setItem(`selectedAccount-${data.ledger.id}`, selectedAccount);
	}

	$: filteredTransactions = data.ledger.transactions
		.filter((tx) => !selectedAccount || tx.from === selectedAccount || tx.to === selectedAccount)
		.filter((tx) => {
			if (startDate && tx.date < parseDateFromInput(startDate)) {
				return false;
			}
			if (endDate && tx.date > parseDateFromInput(endDate)) {
				return false;
			}
			return true;
		})
		.sort((a, b) => b.date.localeCompare(a.date));

	$: chronologicalTransactions = [...filteredTransactions].sort((a, b) =>
		a.date.localeCompare(b.date)
	);

	$: sortedInterestRates = [...data.ledger.interestRates].sort((a, b) =>
		b.date.localeCompare(a.date)
	);

	$: currentRate = sortedInterestRates[0]?.rate ?? 0;

	$: if (chartCanvas && selectedAccount) {
		isCalculating = true;
		console.log('Updating chart for account:', selectedAccount);

		const ctx = chartCanvas.getContext('2d');
		if (ctx) {
			try {
				if (chart) {
					console.log('Destroying existing chart before creating new one');
					chart.destroy();
					chart = null;
				}

				const balances = new Map<string, number>();
				const interestAccrued = new Map<string, number>();
				let currentRate = 0;
				let lastDate = '';

				data.ledger.accounts.forEach((account) => {
					balances.set(account.id, 0);
					interestAccrued.set(account.id, 0);
				});

				const allEvents = [
					...data.ledger.transactions.map((t) => ({
						type: 'transaction' as const,
						date: t.date,
						data: t
					})),
					...data.ledger.interestRates.map((r) => ({
						type: 'rate' as const,
						date: r.date,
						data: r
					}))
				].sort((a, b) => a.date.localeCompare(b.date));

				const timePoints = [];
				const principalPoints = [];
				const interestPoints = [];
				const totalPoints = [];
				const ratePoints = [];

				for (const event of allEvents) {
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
							interestAccrued.set(
								selectedAccount,
								interestAccrued.get(selectedAccount)! + interest
							);
						}
					}

					if (event.type === 'rate') {
						currentRate = event.data.rate;
					} else {
						const tx = event.data;
						if (tx.from === selectedAccount) {
							balances.set(tx.from, balances.get(tx.from)! - tx.amount);
						}
						if (tx.to === selectedAccount) {
							balances.set(tx.to, balances.get(tx.to)! + tx.amount);
						}
					}

					lastDate = event.date;

					if (selectedAccount) {
						const principal =
							balances.get(selectedAccount)! - interestAccrued.get(selectedAccount)!;
						const interest = interestAccrued.get(selectedAccount)!;
						const total = balances.get(selectedAccount)!;

						timePoints.push(formatDate(event.date));
						principalPoints.push(principal);
						interestPoints.push(interest);
						totalPoints.push(total);
						ratePoints.push(currentRate);
					}
				}

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
		}
		isCalculating = false;
	}

	onDestroy(() => {
		if (chart) {
			chart.destroy();
			chart = null;
		}
	});

	$: if (data.ledger.transactions.length > 0 && !startDate && !endDate) {
		const dates = data.ledger.transactions.map((tx) => tx.date);
		startDate = formatDateForInput(dates.reduce((a, b) => (a < b ? a : b)));
		endDate = formatDateForInput(dates.reduce((a, b) => (a > b ? a : b)));
	}
</script>

<div class="p-4">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-xl font-semibold">Balance History</h2>
		<div class="flex gap-4">
			<select bind:value={selectedAccount} class="rounded border px-3 py-2">
				<option value="">Select Account</option>
				{#each data.ledger.accounts as account}
					<option value={account.id}>{account.name}</option>
				{/each}
			</select>
			<a
				href="/{data.ledger.id}"
				class="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
			>
				Back to Balances
			</a>
		</div>
	</div>

	{#if !selectedAccount}
		<div class="py-8 text-center text-gray-500">Select an account to view its balance history</div>
	{:else}
		<DateRangeFilter
			bind:startDate
			bind:endDate
			bind:showInterestRate={showPercentages}
			transactions={data.ledger.transactions}
			onShowInterestRateChange={(value) => (showPercentages = value)}
		/>

		<div class="rounded-lg bg-white p-4 shadow">
			<div style="height: 400px; position: relative; width: 100%;">
				<canvas bind:this={chartCanvas} style="width: 100%; height: 100%;"></canvas>
				{#if isCalculating}
					<div class="bg-opacity-75 absolute inset-0 flex items-center justify-center bg-white">
						<div class="text-gray-500">Calculating balances...</div>
					</div>
				{/if}
			</div>

			{#if filteredTransactions.length === 0}
				<div class="py-8 text-center text-gray-500">
					No transactions found in the selected date range
				</div>
			{:else}
				<div class="mt-8 overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Date</th
								>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Type</th
								>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Amount</th
								>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Balance</th
								>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Interest</th
								>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Description</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each filteredTransactions as tx, i}
								{@const previousTransactions = chronologicalTransactions.slice(
									0,
									chronologicalTransactions.indexOf(tx) + 1
								)}
								{@const runningBalance = previousTransactions.reduce((sum, t) => {
									if (t.from === selectedAccount) return sum - t.amount;
									if (t.to === selectedAccount) return sum + t.amount;
									return sum;
								}, 0)}
								<tr>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500"
										>{formatDate(tx.date)}</td
									>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
										{tx.from === selectedAccount ? 'Debit' : 'Credit'}
									</td>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
										{formatCurrency(tx.amount)}
									</td>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
										{formatCurrency(runningBalance)}
									</td>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
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
			<pre class="mt-1 overflow-auto rounded bg-gray-50 p-2">
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
