<script lang="ts">
	import 'components/lib/theme.css'
	import Text from 'components/lib/Text.svelte'
	import { TextSize } from './lib/types'
	import media from './lib/media'
	import Link from './lib/Link.svelte'
	import { onMount } from 'svelte';

	$: xs = !$media.sm
	$: headerContent = 'Powering platforms for<br/>a better climate future.'

	onMount(() => {
		const options = { root: null, rootMargin: "0px", threshold: [0.4] }
		Array.from(document.querySelectorAll("[data-header-content]")).forEach(s => {
			const observer = new IntersectionObserver(([{intersectionRatio, target}]) => {
				if (intersectionRatio >= options.threshold[0])
					headerContent = (<HTMLElement>target).dataset.headerContent ?? ''
			}, options);
			observer.observe(s)
		})
	})
</script>

<header id="top" class="with-gutter">
	<div class="logo" data-aos="fade-down">
		<a href="#top">
			<img class="link" src="/img/logo-text.svg" alt="SNØCAP" />
		</a>
	</div>
	<div class="row">
		<div data-aos="fade-right" class="col-sm-7">
			<Text size={TextSize.Title}>{@html headerContent}</Text>
		</div>
		<nav data-aos="fade" class="col-sm-5">
			<Link size={TextSize.Small} href="#general-partners">People</Link><br/>
			<Link size={TextSize.Small} href="#contact">Contact</Link>
		</nav>
	</div>
</header>

<style>
	header {
		height: var(--size-header);
		margin: 0;
		padding: 2rem;
		background:  linear-gradient(to top, rgba(255,255,255,0), rgba(255,255,255,0.95), rgba(255,255,255,0.95));
		z-index: 2;
		position: fixed;
		width: 100vw;
	}
	img {
		height: 1.5rem;
		cursor: pointer;
	}
	nav {
		line-height: 1.5;
	}
	.logo {
		margin-bottom: 2rem;
	}
</style>
