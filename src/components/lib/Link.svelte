<script lang="ts">
	import 'components/lib/theme.css'
	import Text from './Text.svelte'
	export let href: string
</script>

<a {href}>
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
		opacity: .5;
	}
	:global(.link.active, .link:active) {
		opacity: .7;
		text-decoration: underline;
	}
</style>
