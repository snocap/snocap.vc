export type PortfolioItem = {
  id: string;
  name: string;
  logo: string;
  sectors: string[];
  website: string;
  blog?: string;
};

export const portfolio: PortfolioItem[] = [
  {
    id: "sparxell",
    name: "Sparxell",
    logo: "/assets/portfolio/logo-sparxell.png",
    sectors: ["Materials", "Cosmetics"],
    website: "https://sparxell.com/",
    // blog: "https://blog.snocap.vc/blah",
  },
  {
    id: "revivbio",
    name: "Reviv Bio",
    logo: "/assets/portfolio/logo-revivbio.svg",
    sectors: ["Research", "Agriculture", "Chemicals"],
    website: "https://www.revivbio.com/",
  },
  {
    id: "sironix",
    name: "Sironix Renewables",
    logo: "/assets/portfolio/logo-sironix.png",
    sectors: ["Chemicals", "Cosmetics"],
    website: "https://sironixrenewables.com/",
  },
  {
    id: "sofab",
    name: "SoFab Inks",
    logo: "/assets/portfolio/logo-sofab.svg",
    sectors: ["Energy", "Materials"],
    website: "https://www.sofabinks.com/",
  },
  {
    id: "grain",
    name: "Grain Ecosystem",
    logo: "/assets/portfolio/logo-grain.png",
    sectors: ["Finance", "Reporting"],
    website: "https://www.grainecosystem.com/",
  },
  {
    id: "coolamps",
    name: "CoolAmps",
    logo: "/assets/portfolio/logo-coolamps.png",
    sectors: ["Energy", "Materials", "Recycling"],
    website: "https://www.coolamps.tech/",
  },
  {
    id: "bloom",
    name: "Bloom",
    logo: "/assets/portfolio/logo-bloom.svg",
    sectors: ["Finance", "Logistics", "Manufacturing"],
    website: "https://togetherwebloom.us/",
  },
  {
    id: "trimagnetix",
    name: "TriMagnetix",
    logo: "/assets/portfolio/logo-trimagnetix.png",
    sectors: ["Compute", "Energy", "Datacenters"],
    website: "https://trimagnetix.com/",
  },
  {
    id: "mothership",
    name: "Mothership Materials",
    logo: "/assets/portfolio/logo-mothership-materials.svg",
    sectors: ["Waste", "Chemicals", "Recycling"],
    website: "https://mothershipmaterials.com/",
  },
].sort((a, b) => a.name.localeCompare(b.name));
