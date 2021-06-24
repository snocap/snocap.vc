<script lang="ts">
	import 'components/lib/theme.css'
	import Person from 'components/Person.svelte'
</script>

<section id="people" data-header-content="General Partners">
		<Person
			name="Nate Salpeter, GP"
			linkedinURI="https://www.linkedin.com/in/nathaniel-salpeter-77145712/"
			headshotURI="/headshots/ns.jpeg"
			reversed
		>
			Ph.D. Mechanical Engineer with 13 years experience in the climate tech space, including 5 years at Bill Gates’ TerraPower. He is the co-founder of Sweet Farm, a Silicon Valley based non-profit incubating food, agriculture, and climate tech startups. He invests and personally advises in emerging sectors, including being the first investor in and an advisor to TurtleTree Labs
		</Person>
		<Person
			name="Jonathan Azoff, MP"
			linkedinURI="https://www.linkedin.com/in/jazoff/"
			headshotURI="/headshots/ja.jpeg"
		>
			Software engineering leader with twenty years of experience across a wide array of sectors (social, gaming, real estate, fitness, logistics, fintech) and two notable exits in the past ten years (Zillow, Disney). He’s the inventor of Goat-2-Meeting (2M+ ARR), the primary architect behind Omni (25M+ XRP raise), and the manager behind VC software at Carta (7B valuation).
		</Person>
	</section>

<style>
	section {
		padding-top: var(--size-header);
	}
</style>