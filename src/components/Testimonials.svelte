<script lang="ts">
	import 'components/lib/theme.css'
	import Testimonial from 'components/Testimonial.svelte'
	import Carat from 'components/Carat.svelte'
</script>

<section id="testimonials" data-header-content="Powering platforms for<br/>a better climate future.">
	<div class="with-gutter">
		<Testimonial
			name="Felipe Giannetti, Partner @ StartSe"
			headshotURI="/headshots/fg.jpeg">
			I had the opportunity to connect startups that use the resources of Sweet Farm to prototype and scale their innovation to leaders and investors from Latin America. This is a unique opportunity to put two continents that are so important to food production together.
		</Testimonial>
		<Testimonial
			name="Fengru Lin, CEO @ TurtleTree"
			headshotURI="/headshots/fl.jpeg"
			reversed>
			TurtleTree has been really fortunate to have the support of Sweet Farm right from the beginning. Nate and Anna have a knack for identifying founders at an early stage that have significant potential. They have been extremely valuable to help us ideate, strategize and think through many of our early decisions.
		</Testimonial>
	</div>
	<Carat fragment="general-partners" />
</section>

<style>
	section {
		transition: padding-top 300ms;
		padding: var(--size-header) 0 0;
	}
</style>