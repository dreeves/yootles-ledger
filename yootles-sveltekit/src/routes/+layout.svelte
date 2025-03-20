<script lang="ts">
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
</script>

<Nav />

<main class="min-h-[calc(100vh-4rem)] bg-gray-50">
	<div class="mx-auto h-full max-w-7xl py-6 sm:px-6 lg:px-8">
		<slot />
	</div>
</main>
