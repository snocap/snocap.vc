<script>
	import Text from './lib/Text.svelte'
	import media from './lib/media'
	import { TextSize } from './lib/types'

	export let name: string
	export let headshotURI: string
	export let reversed: boolean = false
	$: reverse = reversed && $media.sm
</script>

<div data-aos={reverse ? 'fade-right' : 'fade-left'} class="row end-xs start-sm" class:reverse>
	<div class="text col-sm-9 col-xs-12">
		<Text size={TextSize.Aside}>
			<q><slot /></q>
		</Text>
		<br/><br/><Text size={TextSize.Paragragh}>{name}</Text>
	</div>
	<div class="image col-sm-3 col-xs-12">
		<div class="figure" style="background-image:url('{headshotURI}')" />
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
		padding-bottom: 2rem;
	}
	.text {
		text-align: left;
		margin: auto 0 auto auto;
		line-height: 1.5;
	}
	.reverse .text {
		margin: auto auto auto 0;
	}
	.figure {
		display: block;
		position: relative;
		background: none #ccc center center / cover;
		height: 0;
		width: 100%;
		padding-top: 100%;
	}
</style>
