import { strings } from "./strings";

export type EcosystemPartnerKey = 'snocap' | 'sweetfarm' | '9zero' | 'wocl' | 'cff' 

export interface EcosystemPartner {
	id: EcosystemPartnerKey,
	name: string,
	tabImage: string,
	previewImage: string,
	link: string,
	tags: string[],
	description: string
}

export const partners: EcosystemPartner[] = [
	{
		id: 'snocap',
		name: "SNØCAP",
		tabImage: "/assets/branding/logo-snocap-text.svg",
		previewImage: "/assets/ecosystem/preview-snocap.png",
		link: strings.canonicalUrl,
		tags: ["Finance", "Venture Capital"],
		description: `
			SNØCAP is a venture fund focused on deep, scientific innovations reduce costs and pollution at the same time. The firm is managed by engineers and General Partners Shrina Kurani, Nate Salpeter, and Jonathan Azoff.The management team has a uniquely deep operational, technical and investing background that they use to determine the winning business models of the future.
			
			The team has been working together since 2015, co-investing and incubating frontier technologies for over a decade. SNØCAP's unique value-add comes from its engineering experience and expert relationships across energy, food, agriculture, waste, and material sciences. Just about half of funding introductions come from direct application!
		`,
	},
	{
		id: 'sweetfarm',
		name: "Sweet Farm",
		tabImage: "/assets/branding/logo-sweetfarm.png",
		previewImage: "/assets/ecosystem/preview-sweetfarm.png",
		link: "https://sweetfarm.org",
		tags: ["Research", "Incubator"],
		description: `
			Sweet Farm is working to make a more compassionate and sustainable food system on a global scale. Sweet Farm's technology program is a major part of the non-profit's ongoing climate efforts.  The organization's technology accelerator is now entering its 10th year, creating optimism for  the future of science and sustainability. The program supports start-ups across food, agriculture,  sustainability, and climate technologies. 
			
			GP Nate Salpeter is the co-founder of the non-profit, leading its technology efforts and strategic relationship with SNØCAP.  
		`,
	},
	{
		id: '9zero',
		name: "9Zero",
		tabImage: "/assets/branding/logo-9zero.png",
		previewImage: "/assets/ecosystem/preview-9zero.png",
		link: "https://9zero.com",
		tags: ["Club", "Development Programs"],
		description: `
			9Zero is a community of founders, investors, scientists, and innovators who drive climate action together. 
			Through their club, events, and connections, they build relationships and accelerate solutions.
			SNØCAP and 9Zero are major partners in launching the global LAV investment marketplace, backing the
			development of hardtech and deeptech businesses, using a first-of-its-kind private funding program.

			GP Jonathan Azoff is one of the initial investors in 9Zero, and is proud to call Seattle's 9Zero location the home of SNØCAP's first office.
		`,
	},
	{
		id: 'wocl',
		name: "Work on Climate",
		tabImage: "/assets/branding/logo-wocl.png",
		previewImage: "/assets/ecosystem/preview-wocl.png",
		link: "https://workonclimate.org",
		tags: ["Community", "Workforce Transition"],
		description: `
			Work on Climate is building the workforce humanity needs to solve climate change equitably and justly. They are creating opportunities for individuals to bring their talent to climate work, build relationships within the climate movement, and support others on their journey. Their mission is to build a climate workforce faster than any industry in history.

			This effort is powered by a passionate community working together to scale new ideas and inspire others to begin working on climate. SNØCAP is proud to be a strategic sponsor of this transformative initiative.
		`,
	},
	{
		id: 'cff',
		name: "The Climate Film Festival",
		tabImage: "/assets/branding/logo-cff.png",
		previewImage: "/assets/ecosystem/preview-cff.jpg",
		link: "https://climatefilmfestival.org",
		tags: ["Media", "Climate Awareness"],
		description: `
			The Climate Film Festival showcases films and documentaries that highlight the challenges and solutions of the climate crisis. By bringing stories of climate action to the forefront, the festival aims to inspire audiences to take meaningful steps toward a sustainable future.

			GP Jonathan Azoff was one of the inagural sponsors for the film festival, and continues to cultivate narrative development groups for the benefit of climate founders everywhere.
		`,
	},
];