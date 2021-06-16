<script lang="ts">
	import Text from 'components/lib/Text.svelte'
	import Header from 'components/Header.svelte'
	import { TextSize, FontFamily } from './lib/types'
	import Link from 'components/lib/Link.svelte'
	import { onMount } from 'svelte'
	import SmoothScroll from 'smooth-scroll'
	import AOS from 'aos'
	import 'aos/dist/aos.css'
  import Home from './Home.svelte'
	import People from './People.svelte'
	const year = new Date().getFullYear()

	onMount(() => {
		new SmoothScroll('a[href*="#"]')
		AOS.init({ duration: 1000 })
	})
</script>

<div class="app container-fluid">
	<Header />
	<Home />
	<People />
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
		padding: 0;
		transition: opacity 500ms;
		overflow: hidden;
	}
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
