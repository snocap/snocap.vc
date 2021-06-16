<script lang="ts">
	import 'components/lib/theme.css'
	import Text from 'components/lib/Text.svelte'
	import { TextSize } from './lib/types'
	import media from './lib/media'
	import Link from './lib/Link.svelte'
	import { onMount } from 'svelte';
	import type { AOSEvent } from '../types'

	$: xs = !$media.sm
	$: headerContent = 'is building a future beyond sustainability.'

	onMount(() => {
		document.addEventListener('aos:in:section', (evt) => {
			headerContent = (<AOSEvent>evt).detail.dataset.headerContent ?? ''
		});
	})
</script>

<header class="row" class:xs={xs}>
	<div data-aos="fade-right" class="col-xs-10 col-sm-8 header-content">
		<Text size={TextSize.Title}>
			SNØ {headerContent}
		</Text>
	</div>
	<nav data-aos="fade-down" class="col-xs-2 col-sm-4">
		<Link size={TextSize.Small} href="#people">People</Link>
		<div class="padding" />
		<Link size={TextSize.Small} href="#contact">Contact</Link>
	</nav>
</header>

<style>
	:global(body) {
		padding-top: var(--size-header);
	}
	header {
		height: var(--size-header);
		margin: calc(-1 * var(--size-header)) 0 0;
		padding: 2rem;
		background: rgba(255,0,255,0.95);
		z-index: 2;
		position: fixed;
		width: 100vw;
	}
	.xs .header-content {
		padding-right: 0rem;
	}
	.header-content {
		padding-right: 8rem;
	}
	nav {
		padding-left: 1.5rem;
	}
	.padding {
		padding: 0.2rem;
	}
</style>
