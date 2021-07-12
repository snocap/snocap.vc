<script lang="ts">

	import { onMount } from 'svelte'

	import AOS from 'aos'
	import 'aos/dist/aos.css'

	import Header from 'components/Header.svelte'
  import Home from './Home.svelte'
	import Mission from './Mission.svelte'
	import Testimonials from './Testimonials.svelte'
	import People from './People.svelte'
	import Contact from './Contact.svelte'
	import Footer from './Footer.svelte'

	onMount(() => {
		AOS.init({ duration: 1000, disable: 'phone' })
	})
</script>

<div class="app container-fluid">
	<Header />
	<Home />
	<Mission />
	<Testimonials />
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
