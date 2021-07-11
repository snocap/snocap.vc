<script>
	export let fragment: string
</script>

<div class="carat with-gutter">
	<a class="next" href="#{fragment}">
		<img src="/img/carat-down.svg" alt="next section" />
	</a>
</div>

<style>
	.with-gutter {
		flex: 0 0 3rem;
		line-height: 3rem;
		text-align: left;
		width: 100%;
	}
	.next {
		padding: 1rem;
	}
</style>