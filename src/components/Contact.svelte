<script>
import 'components/lib/theme.css'
import Link from "./lib/Link.svelte";
import Text from "./lib/Text.svelte";
import { FontFamily, TextSize } from "./lib/types";

</script>
<section id="contact" data-header-content>
	<div class="row end-xs squishy">
		<div data-aos="fade-left" class="col-xs-11 col-sm-9 mountains" />
	</div>
	<div class="row end-xs">
		<div class="col-xs-11 col-sm-9 forms">
			<div class="row start-xs">
				<div data-aos="fade" class="col-xs-6 email">
					<Text size={TextSize.Header}>Get in Touch</Text>
					<br /><br />
					<Text family={FontFamily.Mono} size={TextSize.Paragraph}>
						<Link family={FontFamily.Mono} size={TextSize.Paragraph} href="mailto:hello@snocap.vc">hello@snocap.vc</Link>
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

<style>
	section {
		padding-top: var(--size-header);
		display: flex;
		flex-direction: column;
		height: calc(100vh - var(--size-header));
		overflow: hidden;
		min-height: 20rem;
	}
	section .row {
		position: relative;
		flex-shrink: 0;
		text-align: left;
		padding: 1rem;
	}
	section .row.squishy {
		flex-shrink: 1;
		flex-grow: 1;
		padding: 0;
	}
	.mountains {
		position: absolute;
		height: 100%;
		width: 100%;
		background: url('/img/mountains.jpg') #ccc center 20% / cover;
	}
	.email {
		padding-left: 0rem;
	}
</style>