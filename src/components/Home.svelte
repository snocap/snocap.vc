<script>
	import 'components/lib/theme.css'
	import Text from 'components/lib/Text.svelte'
	import { FontFamily, TextSize, TextOrientation } from './lib/types';
	import media from './lib/media'
</script>

<section id="home" data-header-content="powers platforms for a better climate future.">
	<div class="row">
		<Text data-aos="fade-left" class="col-xs-offset-1 col-xs-11 col-sm-offset-8 col-sm-4" size={TextSize.Aside}
		>We're not just system thinkers,<br />we're system builders</Text
	>
	</div>
	<div class="row end-xs squishy">
		{#if $media.sm}
			<aside class="col-sm-3">
				<Text
					title="Our Sectors"
					data-aos="fade-right"
					family={FontFamily.Mono}
					orientation={TextOrientation.Vertical}
					size={TextSize.Small}
				>
					Food ∙ Agriculture ∙ Waste<br/>Infrastructure ∙ Crypto
				</Text>
			</aside>
		{/if}
		<!-- svelte-ignore a11y-media-has-caption -->
		<video class="col-xs-11 col-sm-9" playsinline autoplay muted loop controls={false}>
			<source src="/video/mountain_graded.mp4" type="video/mp4" />
		</video>
	</div>
	<div class="row end-xs">
		<Text data-aos="fade-up" data-aos-offset="-16" class="col-xs-11 col-sm-9" family={FontFamily.Mono} size={TextSize.Small}
		><!-- TODO --></Text
	>
	</div>
</section>

<style>
	aside {
		padding-top: 5vh;
	}
	section {
		padding-top: var(--size-header);
		display: flex;
		flex-direction: column;
		height: calc(100vh - var(--size-header));
		overflow: hidden;
		min-height: 37rem;
	}
	section .row {
		flex-shrink: 0;
		text-align: left;
		padding: 1rem;
	}
	section .row.squishy {
		flex-shrink: 1;
		flex-grow: 1;
		padding: 0 0 0 1rem;
	}
	video {
		width: 100%;
		object-fit: cover;
	}
</style>