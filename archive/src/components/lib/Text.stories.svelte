<script lang="js">
	import { Meta, Story, Template } from '@storybook/addon-svelte-csf'
	import Text, { TextOrientation, TextSize, FontFamily } from './Text.svelte'
	const basicArgs = {
		orientation: TextOrientation.Horizontal,
		family: FontFamily.Regular,
		size: TextSize.Aside,
	}

	// TODO: story with custom classes?
</script>

<Meta title="Text" component={Text} />

<Template let:args>
	<Text {...args}>Some Text</Text>
</Template>

<Story name="Basic" args={basicArgs} />
