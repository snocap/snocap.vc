<script>
	import 'components/lib/theme.css'
	import Text from 'components/lib/Text.svelte'
	import Carat from 'components/Carat.svelte'
	import { FontFamily, TextSize, TextOrientation } from './lib/types';
</script>

<section id="home" data-header-content="Powering platforms for <br/> a better climate future.">
	<div class="flex">
		<aside data-aos="fade-right">
			<Text
				title="Our Sectors"
				family={FontFamily.Mono}
				orientation={TextOrientation.Vertical}
				size={TextSize.Small}
			>
				Energy ∙ Industry ∙ Food & Land ∙ Materials ∙ Mobility
			</Text>
		</aside>
		<!-- svelte-ignore a11y-media-has-caption -->
		<video playsinline autoplay muted loop controls={false}>
			<source src="/video/mountain_graded.mp4" type="video/mp4" />
		</video>
	</div>
	<Carat fragment="founders" />
</section>

<style>
	section {
		transition: padding-top 300ms;
		padding-top: var(--size-header-lg);
		height: 100vh;
		overflow: hidden;
		min-height: 35rem;
		display: flex;
		flex-direction: column;
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
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	video {
		object-fit: cover;
		flex: 1;
		height: 100%;
	}
</style>