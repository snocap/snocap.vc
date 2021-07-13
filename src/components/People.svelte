<script lang="ts">
	import 'components/lib/theme.css'
	import Person from 'components/Person.svelte'
</script>

<section id="general-partners" data-header-content="General Partners">
	<Person
		name="Nate Salpeter, GP"
		linkedinURI="https://www.linkedin.com/in/nathaniel-salpeter-77145712/"
		headshotURI="/headshots/ns.jpeg">
		Ph.D. Mechanical Engineer with 13 years experience in the climate tech space, including 5 years at Bill Gates’ TerraPower. He is the co-founder of Sweet Farm, a Silicon Valley based non-profit incubating food, agriculture, and climate tech startups. He invests and personally advises in emerging sectors, including being the first investor in and an advisor to TurtleTree Labs
	</Person>
	<Person
		name="Jonathan Azoff, MP"
		linkedinURI="https://www.linkedin.com/in/jazoff/"
		headshotURI="/headshots/ja.jpeg"
		reversed>
		Software engineering leader with twenty years of experience across a wide array of sectors (social, gaming, real estate, fitness, logistics, fintech) and two notable exits in the past ten years (Zillow, Disney). He’s the inventor of Goat-2-Meeting (2M+ ARR), the primary architect behind Omni (25M+ XRP raise), and the manager behind VC software at Carta (7B valuation).
	</Person>
</section>
<section id="venture-partners" data-header-content="Venture Partners">
	<Person
		name="Abigail Albright"
		linkedinURI="https://www.linkedin.com/in/abigailalbright/"
		headshotURI="/headshots/aa.jpeg">
		Abby Albright is an experienced founding fund partner, having successfully raised a fund in the XR space, specifically focused on placing investments in strong female founding teams.  Abby brings experience from across media formats gained over a wide ranging career in Hollywood and the games industry.
	</Person>
	<Person
		name="Kate Kingen"
		linkedinURI="https://www.linkedin.com/in/katekingen/"
		headshotURI="/headshots/kk.jpeg"
		reversed>
		Kate is a category expert, seasoned senior leader, and finance executive with over a decade of experience. She has led growth companies in the food and DTC consumer industries, managed major governmental organizations, and advised on transactions totaling over $21bn in deal value as an investment banker.
	</Person>
	<Person
		name="Andrew Green"
		linkedinURI="https://www.linkedin.com/in/andrewngreen10/"
		headshotURI="/headshots/ag.jpeg">
		Andrew is a gaming executive and former partner at Andreessen Horowitz (a16z). 20 years in different roles across gaming. Head of biz ops  at mobile games studio TinyCo, acq. Jam City in 2016. Various product and marketing roles at EA, Atari, Miramax Films and Take-Two Interactive. Co-founder of instant-play gaming start-up Knock Knock
	</Person>
</section>

<style>
	section {
		transition: padding-top 300ms;
		padding: var(--size-header-sm) var(--size-gutter) 0;
	}
</style>