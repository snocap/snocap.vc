<script lang="ts">
	import 'components/lib/theme.css'
	import Text from './Text.svelte'
	export let href: string
</script>

<a {href}>
	<Text class="text" {...$$restProps}><slot /></Text>
</a>

<style>
	a {
		transition: opacity 300ms, transform 300ms;
		display: inline-block;
	}
	a:hover {
		opacity: .7;
		transform: translateY(-5%);
	}
	a:active {
		transform: translateY(0%);
	}
</style>
