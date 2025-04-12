<script>
	import 'components/lib/theme.css'
	import Text from 'components/lib/Text.svelte'
	import { TextSize } from './lib/types';
	import Carat from 'components/Carat.svelte'
</script>

<section id="founders" data-header-content="Apply For Funding">
	<img data-aos="fade-in" class="banner" src="/img/social-banner-nologo.png" alt="SNØCAP Banner" />
	<Text data-aos="fade-in" size={TextSize.Header} class="box">
		SNØCAP is a venture capital firm that believes in the power of scientific innovation to solve the climate crisis. 
	</Text>
	<Text data-aos="fade-in" size={TextSize.Aside} class="box aside">
		We are <a href="#general-partners">three engineers</a> who have spent our careers assembling one of <a href="https://www.sweetfarm.org/technology">the best ecosystems for deep tech entrepreneurs in the world</a>. 
		We work best with early stage founders, and we invest in the sort of business that:
	</Text>
	<Text size={TextSize.Paragraph} data-aos="fade-in" class="box no-pad-right">
		<ul>
			<li>📈 Create product(s) that are <strong>immediately cheaper, or dramatically more effective</strong>, than the products they are replacing.</li>
			<li>📉 Lower the cost of doing business for their customers, which are <strong>typically other businesses</strong>.</li>
			<li>🌱 <strong>Reduce the immediate and downstream pollution</strong> their customers emit as a result of adopting their products.</li>
			<li>🧠 Are in the process of <strong>commercializing intellectual property</strong> (IP) that they own or license.</li>
			<li>📚 Developed their IP through years of <strong>academic research or indigenous learnings</strong>.</li>
			<li>📦 Have <strong>exhibited corporate interest</strong>, ranging from written support through to direct sponsorship and purchase orders.</li>
			<li>🧪 Will benefit from the <strong>help of engineers and scientists</strong> to predict the market value of their technology.</li>
			<li>🌍 Could immediately <strong>leverage an ecosystem</strong> of academic partners, cheap field trials, and/or grant application support.</li>
			<li>💰 Are <strong>raising their first round of capital</strong>, outside of grants and other non-dilutive capital.</li>
		</ul>
	</Text>
	<Text size={TextSize.Aside} class="box">
		If this sounds like your startup, or one you know, you can <a href="https://snocap.vc/apply">submit the company for consideration here</a>. 
		Our team reviews new opportunities every week!
	</Text>
	<Carat fragment="general-partners" />
</section>

<style>
	section {
		transition: padding-top 300ms;
		padding: var(--size-header-lg) 0 0;
	}
	.banner {
		width: 100%;
		padding: 0 var(--size-gutter) 1rem;
		object-fit: cover;
		object-position: 0 20%;
		max-height: 12rem;
	}
	section > :global(.box) {
		line-height: 1.25;
		padding: 0 var(--size-gutter) 1rem;
	}
	section > :global(.aside) {
		line-height: 1.6;
	}
	section > :global(.no-pad-right) {
		display: block;
	}
	section ul {
		margin: 0 0 1rem 0;
		line-height: 2;
		padding: 1rem 1rem 1rem 2rem;
		background-color: #FDFDFD;
		border: dotted 1px #EEE;
		border-radius: 2px;
		display: block;
	}

	section ul, section li {
		list-style: none;
	}

</style>