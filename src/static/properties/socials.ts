
export enum SocialNetworkName {
	medium = 'medium',
	linkedin = 'linkedin',
	x = 'x',
	bluesky = 'bluesky',
}

export const properties = {
	[SocialNetworkName.medium]: {
		name: 'Medium',
		title: 'Read our Blog',
		url: 'https://blog.snocap.vc',
		logo: '/assets/social/logo-medium.svg',
	},
	[SocialNetworkName.linkedin]: {
		name: 'LinkedIn',
		title: 'Connect with us on LinkedIn',
		url: 'https://www.linkedin.com/company/snocapvc',
		logo: '/assets/social/logo-linkedin.svg',
	},
	[SocialNetworkName.x]: {
		name: 'X',
		title: 'Follow us on X',
		url: 'https://x.com/snocapvc',
		logo: '/assets/social/logo-x.svg',
	},
	[SocialNetworkName.bluesky]: {
		name: 'BlueSky',
		title: 'Follow us on BlueSky',
		url: 'https://bsky.app/profile/snocapvc.bsky.social',
		logo: '/assets/social/logo-bluesky.svg',
	},
}