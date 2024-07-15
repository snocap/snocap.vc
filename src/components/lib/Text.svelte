<script lang="ts">
	import 'components/lib/theme.css'
	import { TextSize, FontFamily, TextOrientation } from './types'

	export let family: FontFamily = FontFamily.Regular
	export let size: TextSize = TextSize.Paragraph
	export let orientation: TextOrientation = TextOrientation.Horizontal

	let additionalClassNames: string = ''
	export { additionalClassNames as class }

	$: className = `family-${family} size-${size} orientation-${orientation} ${additionalClassNames}`
</script>

<span class={className} {...$$restProps}><slot /></span>

<style>
	span {
		color: var(--color-foreground);
		display: inline-block;
	}

	.family-regular {
		font-family: 'NB Akademie Std', sans-serif;
	}
	.family-mono {
		font-family: 'NB Akademie Mono Std', monospace;
	}

	.size-title {
		font-size: 3.125rem;
	}
	.size-header {
		font-size: 2.5rem;
	}
	.size-aside {
		font-size: 1.5rem;
	}
	.size-paragraph {
		font-size: 1.25rem;
	}
	.size-small {
		font-size: 1.125rem;
	}
	.size-xsmall {
		font-size: 0.8rem;
	}

	.orientation-vertical {
		writing-mode: vertical-rl;
		transform: rotate(-180deg);
	}
</style>
