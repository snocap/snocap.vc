<script lang="ts">
	import 'components/lib/theme.css'
	import Person from 'components/Person.svelte'
</script>

<section id="general-partners" data-header-content="General Partners">
	<Person
		name="Shrina Kurani, MP"
		linkedinURI="https://www.linkedin.com/in/shrina-kurani-94a88b56/"
		headshotURI="/headshots/sk.jpeg">
		Mechanical engineer and sustainability scientist with a decade of experience building, investing in, and advocating for frontier climate tech. She invested in early stage, mission driven companies with Better Ventures and built out Republic’s business lines as VP, democratizing access to capital. Shrina ran for United States Congress championing strong climate policy. 
	</Person>
	<Person
		name="Nate Salpeter, GP"
		linkedinURI="https://www.linkedin.com/in/nathaniel-salpeter-77145712/"
		headshotURI="/headshots/ns.jpeg"
		reversed>
		Ph.D. Mechanical Engineer with 13 years experience in the climate tech space, including 5 years at Bill Gates’ TerraPower. He is the co-founder of Sweet Farm, a Silicon Valley based non-profit incubating food, agriculture, and climate tech startups. He invests and personally advises in emerging sectors, including being the first investor in and an advisor to TurtleTree Labs
	</Person>
	<Person
		name="Jonathan Azoff, GP"
		linkedinURI="https://www.linkedin.com/in/jazoff/"
		headshotURI="/headshots/ja.jpeg">
		Software engineering leader with twenty years of experience across a wide array of sectors (social, gaming, real estate, fitness, logistics, fintech) and two notable exits in the past ten years (Zillow, Disney). He’s the inventor of Goat-2-Meeting (2M+ ARR), the primary architect behind Omni (25M+ XRP raise). He managed several teams at Carta (7B valuation), where he led tool development for the VC back office.
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
		name="HonMun Yip"
		linkedinURI="https://www.linkedin.com/in/yiphonmun/"
		headshotURI="/headshots/hy.jpeg">
		Hon Mun has over thirty years of investment, operations, and board level experience with PE funds, family offices and start-ups. For more than a decade and a half, he was based in Hong Kong, Bangkok, Seoul and China performing Post M&A integration, turning-around and growing businesses for Private Equity Funds and family-owned Asia businesses. He ventured into ESG and Sustainability businesses when he was the CEO of a Singapore-China government Joint Venture pioneering in sustainable farming and food security in North East China. He served as the EVP for Turtletree Lab, COO for an Impact Philanthropy fund and an active investor in the alternative protein space.
	</Person>
</section>

<style>
	section {
		transition: padding-top 300ms;
		padding: var(--size-header-sm) var(--size-gutter) 0;
	}
</style>