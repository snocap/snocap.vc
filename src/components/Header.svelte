<script lang="ts">
	import Text from 'components/lib/Text.svelte'
	import { TextSize } from './lib/types'
	import media from './lib/media'
	import Link from './lib/Link.svelte'
	$: xs = !$media.sm
</script>

<header class="row" class:reverse={!xs}>
	<nav data-aos="fade-down" class="col-xs-2 col-sm-4" class:col-xs-offset-10={xs} class:padded={xs}>
		<Link size={TextSize.Small} href="#people">People</Link>
		<div class="padding" />
		<Link size={TextSize.Small} href="#contact">Contact</Link>
	</nav>
	<Text data-aos="fade-right" class="col-xs-12 col-sm-8" size={TextSize.Title}>
		SNØ is building a future {#if !xs}<br />{/if} beyond sustainability.
	</Text>
</header>

<style>
	header {
		padding: 2rem;
	}
	nav {
		padding-left: 1.5rem;
	}
	nav.padded {
		padding-bottom: 2rem;
	}
	.padding {
		padding: 0.2rem;
	}
</style>
