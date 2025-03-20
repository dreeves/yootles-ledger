<script lang="ts">
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
</script>

<Nav />

<main class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <slot />
  </div>
</main>
