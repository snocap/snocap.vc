<script lang="ts">
	import 'components/lib/theme.css'
	import Text from 'components/lib/Text.svelte'
	import { TextSize } from './lib/types'
	import media from './lib/media'
	import Link from './lib/Link.svelte'
	import { onMount } from 'svelte';

	$: xs = !$media.sm
	$: headerContent = 'is building a future beyond sustainability.'

	onMount(() => {
		const options = { root: null, rootMargin: "0px", threshold: [0.2] }
		Array.from(document.querySelectorAll("[data-header-content]")).forEach(s => {
			const observer = new IntersectionObserver(([{intersectionRatio, target}]) => {
				if (intersectionRatio >= options.threshold[0])
					headerContent = (<HTMLElement>target).dataset.headerContent ?? ''
			}, options);
			observer.observe(s)
		})
	})
</script>

<header class="row" class:xs={xs}>
	<div data-aos="fade-right" class="col-xs-10 col-sm-8 header-content">
		<Text size={TextSize.Title}>
			<Link size={TextSize.Title} href="#home">SNØ</Link> {headerContent}
		</Text>
	</div>
	<nav data-aos="fade-down" class="col-xs-2 col-sm-4">
		<Link size={TextSize.Small} href="#people">People</Link>
		<div class="padding" />
		<Link size={TextSize.Small} href="#contact">Contact</Link>
	</nav>
</header>

<style>
	header {
		height: var(--size-header);
		margin: 0;
		padding: 2rem;
		background: linear-gradient(to top, rgba(255,255,255,0), rgba(255,255,255,1));
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
