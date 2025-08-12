import { strings } from "./strings";

export type EcosystemPartnerKey =
  | "snocap"
  | "sweetfarm"
  | "9zero"
  | "wocl"
  | "cff"
  | "envest";

export interface EcosystemPartner {
  id: EcosystemPartnerKey;
  name: string;
  tabImage: string;
  previewImage: string;
  link: string;
  tags: string[];
  description: string;
}

export const partners: EcosystemPartner[] = [
  {
    id: "snocap",
    name: "SNØCAP",
    tabImage: "/assets/branding/logo-snocap-text.svg",
    previewImage: "/assets/ecosystem/preview-snocap.jpg",
    link: strings.canonicalUrl,
    tags: ["Finance", "Venture Capital"],
    description: `
			SNØCAP is a deeptech venture capital firm founded in 2023 by engineers Shrina Kurani, Nate Salpeter, and Jonathan Azoff. 
      The founding partners met back in 2015 as individual co-investors in climate tech startups, and have been working 
      together ever since. They bring a mix of engineering, investment, entrepreneurial and policy experience to the firm.

      The firm also works closely with several major universities, research institutions, and non-profits to source and 
      support the best founders in the world. SNØCAP is headquartered in Seattle, with partners in Los Angeles and 
      New York. Their yearly fellowship program started with Yale University in 2023, and has since expanded to Stanford, 
      Skidmore, the University of Michigan, and the University of Washington, with many more to come.
		`,
  },
  {
    id: "sweetfarm",
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
    id: "9zero",
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
    id: "envest",
    name: "Envest",
    tabImage: "/assets/branding/logo-envest.png",
    previewImage: "/assets/ecosystem/preview-envest.png",
    link: "https://envest.earth",
    tags: ["Venture Capital", "Trade Group"],
    description: `
			Envest is a global coalition of climate-focused venture capital funds and investors. The group is dedicated to 
      accelerating the transition to a net-zero economy by pooling resources, sharing insights, and co-investing in 
      transformative technologies. Envest members collaborate to identify high-impact opportunities and support 
      innovative startups that are driving climate solutions.

      VP Kelci Zile and operations lead Jackie Moe run the day-to-day operations of Envest, and SNØCAP is proud to
      be a member in good standing of this important coalition. 
		`,
  },
  {
    id: "wocl",
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
    id: "cff",
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
