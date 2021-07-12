<script>
	import 'components/lib/theme.css'
	import Text from 'components/lib/Text.svelte'
	import { TextSize } from './lib/types';
	import Carat from 'components/Carat.svelte'
</script>

<section id="mission" data-header-content="Powering platforms for <br/> a better climate future.">
	<Text size={TextSize.Header} class="box top">
		We invest in early-stage, profit-oriented platforms that directly and indirectly solve the climate crisis.
	</Text>
	<Text size={TextSize.Aside} class="box bottom">
		The SNØCAP ecosystem sources and supports the world’s best founding teams.
	</Text>
	<Carat fragment="testimonials" />
</section>

<style>
	section {
		transition: padding-top 300ms;
		padding-top: var(--size-header);
		height: 100vh;
		overflow: hidden;
		min-height: 35rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-items: stretch;
	}
	section > :global(.box) {
		flex: 1 1 50%;
		display: flex;
		line-height: 1.25;
		padding: 1em;
	}
	section > :global(.box.top) {
		width: 72%;
		align-items: flex-end;
	}
	section > :global(.box.bottom) {
		width: 45%;
		align-items: flex-start;
	}
</style>