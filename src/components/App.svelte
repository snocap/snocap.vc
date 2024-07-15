<script lang="ts">

	import { onMount } from 'svelte'

	import AOS from 'aos'
	import 'aos/dist/aos.css'

	import Header from './Header.svelte'
  import Home from './Home.svelte'
	import Founders from './Founders.svelte'
	import People from './People.svelte'
	import Contact from './Contact.svelte'
	import Footer from './Footer.svelte'

	export let route: string;

	onMount(() => {
		AOS.init({ duration: 1000, disable: 'phone' })
	})

	if (route === 'apply') {
		window.location.href = 'https://form-23cf11.zapier.app/apply-to-snocap'
	}
</script>

<div class="app container-fluid">
	{#if route === "apply"}
		<div class="apply">Redirecting...</div>
	{:else}
		<Header />
		<Home />
		<Founders />
		<People />
		<Contact />
		<Footer />
	{/if}
</div>

<style>
	.app {
		padding: 0;
	}
	.apply {
		height: 100vh;
		text-align: center;
		padding: 1rem;
	}
</style>
