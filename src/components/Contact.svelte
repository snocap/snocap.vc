<script>
import 'components/lib/theme.css'
import Link from "./lib/Link.svelte";
import Text from "./lib/Text.svelte";
import { TextSize } from "./lib/types";
</script>

<section id="contact" data-header-content="Get in touch">
	<div class="row with-gutter">
		<div data-aos="fade-left" class="links col-sm-offset-7 col-sm-5">
			<Link size={TextSize.Aside} href="mailto:hello@snocap.vc">hello@snocap.vc</Link>
			<br />
			<a class="social" href="https://twitter.com/snocapvc">
				<img alt="twitter page" src="/img/twitter.svg" />
			</a>
			<a class="social" href="https://linkedin.com/company/snocapvc">
				<img alt="linkedin page" src="/img/linkedin.svg" />
			</a>
		</div>
	</div>
	<div class="mountains-container with-gutter">
		<div data-aos="fade-left" class="mountains col-xs-12" />
	</div>
</section>

<style>
	section {
		transition: padding-top 300ms;
		padding-top: var(--size-header-sm);
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}
	.row {
		margin-left: 0;
	}
	.links {
		flex: 0 0 1rem;
		white-space: nowrap;
		padding: 4rem 0;
	}
	.mountains-container {
		flex: 1;
		padding-right: 0;
	}
	.mountains {
		height: 100%;
		width: 100%;
		background: url('/img/mountains.jpg') #ccc center 20% / cover;
	}
	.social img {
		width: 1.25rem;
		opacity: 0.8;
		transition: opacity 300ms;
		margin: 1rem 1rem 0 0;
	}
	.social:hover img {
		opacity: 1;
	}
</style>