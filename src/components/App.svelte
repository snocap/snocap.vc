<script lang="ts">
	import Text from 'components/lib/Text.svelte'
	import Header from 'components/Header.svelte'
	import { TextSize, FontFamily, TextOrientation } from './lib/types'
	import media from './lib/media'
	import Person from 'components/Person.svelte'
	import Link from 'components/lib/Link.svelte'
	import { onMount } from 'svelte'
	import SmoothScroll from 'smooth-scroll'
	import AOS from 'aos'
	import 'aos/dist/aos.css'
	const year = new Date().getFullYear()

	onMount(() => {
		new SmoothScroll('a[href*="#"]')
		AOS.init({ duration: 1000 })
	})
</script>

<div class="app container-fluid">
	<Header />
	<section class="row">
		<Text data-aos="fade-left" class="col-xs-offset-1 col-xs-11 col-sm-offset-8 col-sm-4" size={TextSize.Aside}
			>We're starting a revolution, vetting sector winning investments that combat climate change.</Text
		>
	</section>
	<section class="row end-xs">
		{#if $media.sm}
			<aside class="col-sm-3">
				<Text
					data-aos="fade-right"
					family={FontFamily.Mono}
					orientation={TextOrientation.Vertical}
					size={TextSize.Small}
				>
					If we only sustain,<br />we will never progress.
				</Text>
			</aside>
		{/if}
		<!-- svelte-ignore a11y-media-has-caption -->
		<video class="col-xs-11 col-sm-9" playsinline autoplay controls={false} loop>
			<source src="/video/mountain_graded.mp4" type="video/mp4" />
		</video>
	</section>
	<section class="row end-xs">
		<Text data-aos="fade-up" class="col-xs-11 col-sm-9" family={FontFamily.Mono} size={TextSize.Small}
			>We are solving the climate crisis through tech and innovation amplified by narrative and design.</Text
		>
	</section>
	<section id="people">
		<Text data-aos="fade-down" size={TextSize.Title}>SNØ General Partners</Text>
		<Person
			name="Susanna Barla, GP"
			linkedinURI="https://www.linkedin.com/in/susanna-barla/"
			headshotURI="/headshots/sb.jpeg"
		>
			Founder, entrepreneur and strategist for highly curated agents of change. She directly helped startup founders
			raise over $120M across seed and series A rounds - all in the past 5 years. Prior to this she was leading
			marketing & communication for luxury brands including Martin Margiela, Rick Owens and Louis Vuitton.
		</Person>
		<Person
			name="Nate Salpeter, GP"
			linkedinURI="https://www.linkedin.com/in/nathaniel-salpeter-77145712/"
			headshotURI="/headshots/ns.jpeg"
			reversed
		>
			Ph.D. Mechanical Engineer with 13 years experience in the climate tech space, including 5 years at Bill Gates’
			TerraPower. He is the co-founder of Sweet Farm, a Silicon Valley based non-profit incubating food, agriculture,
			and climate tech startups. He invests and personally advises in emerging sectors, including being the first
			investor in and an advisor to TurtleTree Labs
		</Person>
		<Person
			name="Jonathan Azoff, MP"
			linkedinURI="https://www.linkedin.com/in/jazoff/"
			headshotURI="/headshots/ja.jpeg"
		>
			Software engineering leader with twenty years of experience across a wide array of sectors (social, gaming, real
			estate, fitness, logistics, fintech) and two notable exits in the past ten years (Zillow, Disney). He’s the
			inventor of Goat-2-Meeting (2M+ ARR), the primary architect behind Omni (25M+ XRP raise), and the manager behind
			VC software at Carta (7B valuation).
		</Person>
	</section>
	<section id="contact">
		<Text data-aos="fade-down" size={TextSize.Title}>SNØ</Text>
		<div class="row end-xs">
			<div
				data-aos="fade-left"
				class="col-xs-11 col-sm-9 mountains"
				style="background-image: url('/img/mountains.jpg');"
			/>
		</div>
		<div class="row end-xs">
			<div class="col-xs-11 col-sm-9 forms">
				<div class="row start-xs">
					<div data-aos="fade" class="col-xs-6 email">
						<Text size={TextSize.Header}>Get in Touch</Text>
						<br /><br />
						<Text family={FontFamily.Mono} size={TextSize.Paragraph}>
							<Link family={FontFamily.Mono} size={TextSize.Paragraph} href="mailto:hello@sno.llc">hello@sno.llc</Link>
							<br /><br />
							[<Link
								family={FontFamily.Mono}
								size={TextSize.Paragraph}
								href="https://www.linkedin.com/company/snocapfund">LINKEDIN</Link
							>]
						</Text>
					</div>
				</div>
			</div>
		</div>
	</section>
	<section>
		<center
			>&mdash;<br />&copy; {year} SNO Management, LLC. All rights reserved.<br />SNOCAP US, LP is a 506(c) registered
			offering.</center
		>
	</section>
</div>

<style>
	.app {
		padding: 1rem;
		transition: opacity 500ms;
		overflow: hidden;
	}
	aside {
		padding-top: 5vh;
	}
	section {
		padding-bottom: 2rem;
		text-align: left;
	}
	video {
		height: 61vh;
		min-height: 20.5rem;
		max-height: 40rem;
		padding-right: 0;
		object-fit: cover;
	}
	#people,
	#contact {
		margin-top: 8rem;
		padding-top: 1rem;
	}
	.mountains {
		height: 0;
		padding-top: 40%;
		margin-top: 4rem;
		background: none #ccc center center / cover;
	}
	.email {
		padding-top: 4rem;
		padding-left: 0rem;
	}
	center {
		padding-top: 5em;
		line-height: 1.4;
	}
</style>
