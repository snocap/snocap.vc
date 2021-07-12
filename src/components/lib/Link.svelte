<script lang="ts">
	import 'components/lib/theme.css'
	import type { EventHandler } from './types'
	import Text from './Text.svelte'
	export let href: string
	export let onclick: EventHandler|undefined = undefined
</script>

<a {href} on:click={onclick}>
	<Text class="link text" {...$$restProps}><slot /></Text>
</a>

<style>
	a {
		display: inline-block;
	}
	:global(.link) {
		transition: opacity 300ms;
	}
	:global(.link:hover) {
		text-decoration: underline;
	}
	:global(.link.active, .link:active) {
		text-decoration: dotted;
	}
</style>
