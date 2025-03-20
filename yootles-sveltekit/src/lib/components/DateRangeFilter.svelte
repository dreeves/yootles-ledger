<script lang="ts">
	import { formatDateForInput } from '$lib/utils/formatting';

	export let startDate: string;
	export let endDate: string;
	export let showInterestRate: boolean | undefined = undefined;
	export let onShowInterestRateChange: ((value: boolean) => void) | undefined = undefined;

	// Initialize date range if not set
	export let transactions: Array<{ date: string }>;
	$: if (transactions.length > 0 && !startDate && !endDate) {
		const dates = transactions.map((tx) => tx.date);
		startDate = formatDateForInput(dates.reduce((a, b) => (a < b ? a : b)));
		endDate = formatDateForInput(dates.reduce((a, b) => (a > b ? a : b)));
	}
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
	<div>
		<label for="start-date" class="mb-1 block text-sm font-medium text-gray-700">
			Start Date
		</label>
		<input
			id="start-date"
			type="date"
			bind:value={startDate}
			class="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
		/>
	</div>

	<div>
		<label for="end-date" class="mb-1 block text-sm font-medium text-gray-700"> End Date </label>
		<input
			id="end-date"
			type="date"
			bind:value={endDate}
			class="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
		/>
	</div>

	{#if showInterestRate !== undefined && onShowInterestRateChange}
		<div>
			<label for="show-interest-rate" class="mb-1 block text-sm font-medium text-gray-700">
				Show Interest Rate
			</label>
			<div class="mt-1 inline-flex items-center">
				<input
					id="show-interest-rate"
					type="checkbox"
					checked={showInterestRate}
					on:change={(e) => onShowInterestRateChange(e.currentTarget.checked)}
					class="form-checkbox h-4 w-4 text-blue-600"
				/>
				<span class="ml-2">Show rate over time</span>
			</div>
		</div>
	{/if}
</div>
