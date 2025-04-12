import watchMedia from 'svelte-media'
import type { Writable } from 'svelte/store'

const mediaqueries = {
	sm: '(min-width: 48em)',
	md: '(min-width: 62em)',
	lg: '(min-width: 75em)',
	landscape: '(orientation: landscape)',
	portrait: '(orientation: portrait)',
	dark: '(prefers-color-scheme: dark)',
	light: '(prefers-color-scheme: light)',
	noanimations: '(prefers-reduced-motion: reduce)',
}

type MediaWatcher = {
	sm: boolean
	md: boolean
	lg: boolean
	landscape: boolean
	portrait: boolean
	dark: boolean
	light: boolean
	noanimations: boolean
}

const media = watchMedia(mediaqueries) as Writable<MediaWatcher>

export default media
