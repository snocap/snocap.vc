<script lang="ts">

	import { onMount } from 'svelte'
	import SmoothScroll from 'smooth-scroll'

	import AOS from 'aos'
	import 'aos/dist/aos.css'

	import Header from 'components/Header.svelte'
  import Home from './Home.svelte'
	import Mission from './Mission.svelte'
	import People from './People.svelte'
	import Contact from './Contact.svelte'
	import Footer from './Footer.svelte'

	onMount(() => {
		new SmoothScroll('a[href*="#"]')
		AOS.init({ duration: 1000 })
	})
</script>

<div class="app container-fluid">
	<Header />
	<Home />
	<Mission />
	<People />
	<Contact />
	<Footer />
</div>

<style>
	.app {
		padding: 0;
		transition: opacity 500ms;
		overflow: hidden;
	}
</style>
