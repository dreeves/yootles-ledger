<script lang="ts">
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
</script>

<Nav />

<main class="min-h-[calc(100vh-4rem)] bg-custom-secondary">
	<div class="mx-auto h-full max-w-7xl py-4 sm:px-4 lg:px-6">
		<slot />
	</div>
</main>
