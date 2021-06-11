<script lang="ts">
	import 'components/lib/theme.css'
	import Text from './Text.svelte'
	export let href: string
</script>

<a {href}>
	<Text class="text" {...$$restProps}><slot /></Text>
</a>

<style>
	a:hover {
		border-bottom: dashed 1px black;
	}
</style>
