<script>
	import Link from './lib/Link.svelte'
	import Text from './lib/Text.svelte'
	import media from './lib/media'
	import { FontFamily, TextSize } from './lib/types'

	export let name: string
	export let linkedinURI: string
	export let headshotURI: string
	export let reversed: boolean = false
	$: reverse = reversed && $media.sm
</script>

<div data-aos={reverse ? 'fade-right' : 'fade-left'} class="row end-xs start-sm" class:reverse>
	<div class="text col-sm-8 col-xs-11">
		<Text size={TextSize.Header}>{name}</Text>
		<p>
			<Text family={FontFamily.Mono} size={TextSize.Paragraph}>
				<slot /><br /><br />
				[<Link family={FontFamily.Mono} size={TextSize.Paragraph} href={linkedinURI}>LINKEDIN</Link>]
			</Text>
		</p>
	</div>
	<div class="image col-sm-4 col-xs-11">
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
	}
	.text {
		max-width: 39rem;
		display: inline-block;
		text-align: left;
		margin: auto;
		vertical-align: middle;
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
