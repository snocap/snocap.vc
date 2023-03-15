<script lang="ts">

	import { onMount } from 'svelte'

	import AOS from 'aos'
	import 'aos/dist/aos.css'

	import Header from './Header.svelte'
  import Home from './Home.svelte'
	import Mission from './Mission.svelte'
	import Testimonials from './Testimonials.svelte'
	import People from './People.svelte'
	import Contact from './Contact.svelte'
	import Footer from './Footer.svelte'

	export let route: string;

	onMount(() => {
		AOS.init({ duration: 1000, disable: 'phone' })
	})
</script>

<div class="app container-fluid">
	{#if route === "apply"}
		<iframe 
			title="Application Form" 
			class="airtable-embed" 
			src="https://airtable.com/embed/shrhw2LK0yxRos5fW?backgroundColor=white" 
			frameborder="0" 
			onmousewheel="" 
			width="100%" 
			height="533"
		/>
	{:else}
		<Header />
		<Home />
		<Mission />
		<Testimonials />
		<People />
		<Contact />
	{/if}
	<Footer />
</div>

<style>
	.app {
		padding: 0;
	}
	.airtable-embed {
		background: transparent; 
		border: none 0;
		width: 100vw;
		height: 3705px;
	}
</style>
