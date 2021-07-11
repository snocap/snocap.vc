<script>
	import 'components/lib/theme.css'
	import Text from 'components/lib/Text.svelte'
	import { FontFamily, TextSize, TextOrientation } from './lib/types';
	import media from './lib/media'
</script>

<section id="home">
	<div class="row with-gutter" data-header-content="Powering platforms for<br/>a better climate future.">
		<Text data-aos="fade-left" class="col-sm-offset-7 col-sm-5" size={TextSize.Aside}
		>We're not just system thinkers,<br />we're system builders</Text
	>
	</div>
	<div class="flex">
		{#if $media.sm}
			<aside data-aos="fade-right">
				<Text
					title="Our Sectors"
					family={FontFamily.Mono}
					orientation={TextOrientation.Vertical}
					size={TextSize.Small}
				>
					Crypto ∙ Waste ∙ Food ∙ Ag ∙ Infrastructure
				</Text>
			</aside>
		{/if}
		<!-- svelte-ignore a11y-media-has-caption -->
		<video playsinline autoplay muted loop controls={false}>
			<source src="/video/mountain_graded.mp4" type="video/mp4" />
		</video>
	</div>
	<div class="row with-gutter">
		<a class="next" href="#mission">
			<img src="/img/carat-down.svg" alt="next section" />
		</a>
	</div>
</section>

<style>
	section {
		padding-top: var(--size-header);
		height: 100vh;
		overflow: hidden;
		min-height: 35rem;
		display: flex;
		flex-direction: column;
	}
	.row:first-child {
		height: 6rem;
    flex: 0 0 6rem;
	}
	.row:last-child {
		flex: 0 0 3rem;
		line-height: 2;
	}
	.flex {
		display: flex;
		flex: 1;
		overflow: hidden;
	}
	aside {
		flex: 0 0 var(--size-gutter);
		text-align: center;
		padding: 1rem 0;
		line-height: 1.5;
	}
	video {
		object-fit: cover;
		flex: 1;
		height: 100%;
	}
	.next {
		padding: 1rem;
	}
</style>