<script lang="ts">
	import 'components/lib/theme.css'
	import Text from 'components/lib/Text.svelte'
	import { TextSize } from './lib/types'
	import media from './lib/media'
	import Link from './lib/Link.svelte'
	import { onMount } from 'svelte';
	import Typewriter from 'typewriter-effect/dist/core';

	$: open = false
	$: xs = !$media.sm

	onMount(() => {
		const tw = new Typewriter('#typewriter', { delay: 60, pauseFor: 	0 })
		let debouncer: number|undefined
		let headerContent = ''
		tw.typeString(headerContent).start()
		Array.from(document.querySelectorAll("[data-header-content]")).forEach(s => {
			const options = { root: null, rootMargin: "0px", threshold: [0.2] }
			const observer = new IntersectionObserver(([{intersectionRatio, target}]) => {
				if (intersectionRatio < options.threshold[0]) return
				if (debouncer) clearTimeout(debouncer);
				debouncer = setTimeout(() => {
					const newHeaderContent = (<HTMLElement>target).dataset.headerContent ?? ''
					if (newHeaderContent === headerContent) return
					headerContent = newHeaderContent
					tw.stop().deleteAll(1).callFunction(() => {
						if (headerContent === 'Powering platforms for <br/> a better climate future.') {
							document.documentElement.style.setProperty("--size-header", "var(--size-header-lg)")
						} else {
							document.documentElement.style.setProperty("--size-header", "var(--size-header-sm)")
							window.scroll
						}
					}).typeString(headerContent).start()
				}, 350)
			}, options);
			observer.observe(s)
		})
	})

	const toggle = (_open:boolean) => () => { open = _open }
</script>

<header class="with-gutter" class:xs>
	<div class="logo" data-aos="fade-down">
		<a href="#home">
			<img class="link" src="/img/logo-text.svg" alt="SNØCAP" />
		</a>
	</div>
	<div class="row">
		<div data-aos="fade-right" class="title col-sm-7 col-xs-12">
			<Text id="typewriter" size={TextSize.Title}></Text>
		</div>
		<nav data-aos={xs?"none":"fade"} class="col-sm-5 col-xs-12" class:open>
			<Link onclick={toggle(false)} size={xs?TextSize.Header:TextSize.Small} href="#general-partners">People</Link><br/>
			<Link onclick={toggle(false)} size={xs?TextSize.Header:TextSize.Small} href="#contact">Contact</Link>
		</nav>
		<span class="closer" on:click={toggle(false)} title="close navigation menu">𝖷</span>
		<span class="opener" on:click={toggle(true)} title="open navigation menu">≡</span>
	</div>
</header>

<style>
	header {
		height: var(--size-header);
		margin: 0;
		padding: 2rem;
		background: rgba(255,255,255,0.95);
		z-index: 2;
		position: fixed;
		width: 100vw;
		transition: height 300ms;
	}
	header.xs :global(.title br) {
		display: none;
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
	header.xs nav {
		background: white;
		width: 100vw;
		height: 100vh;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 98;
		text-align: center;
		padding-top: 4rem;
		line-height: 2;
		transition: transform 300ms, box-shadow 300ms;
		transform: translateX(-100%);
		box-shadow: 0 0 0 rgba(0, 0, 0, 0);
	}

	header .opener,
	header .closer {
		display: none;
	}

	header.xs nav.open {
		transform: translateX(0%);
		box-shadow: 0 0 5rem rgba(0, 0, 0, 0.5);
	}

	header.xs .opener,
	header.xs .closer {
		display: inline-block;
		position: absolute;
		padding: 0rem 1rem;
		z-index: 99;
	}

	header.xs .opener {
		content: "≡";
		left: 0;
		top: 0;
		font-size: 3rem;
		line-height: 5.5rem;
		transform: translate(0%, 0%);
		transition: transform 300ms;
	}

	header.xs .closer {
		top: 1.2rem;
		left: 1rem;
		font-size: 1.8rem;
		line-height: 2;
		transition: transform 300ms, opacity 300ms;
		transform: translateY(-300%);
		opacity: 0;
	}

	header.xs nav.open ~ .opener {
		transform: translate(0%, -100%);
	}

	header.xs nav.open ~ .closer {
		transform: translateY(0%);
		opacity: 1;
	}

</style>
