<script lang="js">
	import { Meta, Story, Template } from '@storybook/addon-svelte-csf'
	import Link from './Link.svelte'
</script>

<Meta title="Link" component={Link} />

<Template let:args>
	<Link {...args}>Brown Cardigan</Link>
</Template>

<Story name="Basic" args={{ href: 'https://browncardigan.com' }} />
