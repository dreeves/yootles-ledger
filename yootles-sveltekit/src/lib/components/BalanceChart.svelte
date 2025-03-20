<script lang="ts">
	import { onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { Ledger } from '$lib/types/ledger';
	import {
		formatCurrency,
		formatPercent,
		formatDate,
		parseDateFromInput
	} from '$lib/utils/formatting';

	export let ledger: Ledger;
	export let selectedAccount: string;
	export let showPercentages = false;
	export let startDate: string = '';
	export let endDate: string = '';

	let chartCanvas: HTMLCanvasElement;
	let chart: Chart | null = null;
	let isCalculating = false;

	function isDateInRange(date: string): boolean {
		if (!startDate && !endDate) return true;
		if (startDate && date < parseDateFromInput(startDate)) return false;
		if (endDate && date > parseDateFromInput(endDate)) return false;
		return true;
	}

	$: if (chartCanvas && selectedAccount) {
		isCalculating = true;
		console.log('Updating chart for account:', selectedAccount, { startDate, endDate });

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

				ledger.accounts.forEach((account) => {
					balances.set(account.id, 0);
					interestAccrued.set(account.id, 0);
				});

				const allEvents = [
					...ledger.transactions.map((t) => ({
						type: 'transaction' as const,
						date: t.date,
						data: t
					})),
					...ledger.interestRates.map((r) => ({
						type: 'rate' as const,
						date: r.date,
						data: r
					}))
				]
					.sort((a, b) => a.date.localeCompare(b.date))
					.filter((event) => isDateInRange(event.date));

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
</script>

<div style="height: 400px; position: relative; width: 100%;">
	<canvas bind:this={chartCanvas} style="width: 100%; height: 100%;"></canvas>
	{#if isCalculating}
		<div class="bg-opacity-75 absolute inset-0 flex items-center justify-center bg-white">
			<div class="text-gray-500">Calculating balances...</div>
		</div>
	{/if}
	{#if !chart && !isCalculating}
		<div class="bg-opacity-75 absolute inset-0 flex items-center justify-center bg-white">
			<div class="text-gray-500">No data available for the selected date range</div>
		</div>
	{/if}
</div>
