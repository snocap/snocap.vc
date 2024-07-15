<script>
	import Text from './lib/Text.svelte'
	import media from './lib/media'
	import { TextSize, FontFamily } from './lib/types'

	export let name: string
	export let linkedinURI: string
	export let headshotURI: string
	export let reversed: boolean = false
	$: reverse = reversed && $media.sm
</script>

<div data-aos={reverse ? 'fade' : 'fade-left'} class="row end-xs start-sm" class:reverse>
	<div class="text col-sm-8 col-xs-12">
		<Text size={TextSize.Header}>{name}</Text>
		<p>
			<Text family={FontFamily.Mono} size={TextSize.Paragraph}>
				<slot />
			</Text>
		</p>
	</div>
	<div class="image col-sm-4 col-xs-12">
		<div class="figure" style="background-image:url('{headshotURI}')" />
		<a class="social" href={linkedinURI}>
			<img alt="linkedin page" src="/img/linkedin.svg" />
		</a>
	</div>
</div>

<style>
	.text,
	.image {
		padding: 1rem 2rem;
	}
	.row {
		text-align: left;
		padding-top: 2rem;
	}
	.social img {
		width: 1.25rem;
		opacity: 0.6;
		transition: opacity 300ms;
		margin: 1rem 0;
	}
	.social:hover img {
		opacity: 1;
	}
	.text {
		text-align: left;
		margin: auto;
		vertical-align: middle;
		line-height: 1.5;
	}
	.figure {
		display: block;
		position: relative;
		background: none #ccc center center / cover;
		background-size: 101%;
		height: 0;
		width: 100%;
		padding-top: 100%;
	}
</style>
