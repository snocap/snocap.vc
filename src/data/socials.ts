
export enum SocialNetworkName {
	medium = 'medium',
	linkedin = 'linkedin',
	github = 'github',
	bluesky = 'bluesky',
}

export const socials = {
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
	[SocialNetworkName.github]: {
		name: 'Github',
		title: 'Follow us on Github',
		url: 'https://github.com/snocap',
		logo: '/assets/social/logo-github.svg',
	},
	[SocialNetworkName.bluesky]: {
		name: 'BlueSky',
		title: 'Follow us on BlueSky',
		url: 'https://bsky.app/profile/snocapvc.bsky.social',
		logo: '/assets/social/logo-bluesky.svg',
	},
}