export type MediumPost = {
	source: 'medium';
	title: string;
	link: string;
	published: Date;
	description: string;
	image: string;
};

export async function fetchRecentPosts(): Promise<MediumPost[]> {
	const url = "https://api.rss2json.com/v1/api.json?rss_url=https://medium.com/feed/snocap";
	const response = await fetch(url)
	const body = await response.json()
	if (response.status !== 200) {
		throw new Error(`Error fetching Medium posts: ${response.status}`);
	}
	if (body.status !== "ok") {
		throw new Error(`Error fetching Medium posts: ${body.message}`);
	}
	return body.items.map((item: any) => ({
		source: "medium",
		title: item.title,
		link: item.link,
		published: new Date(item.pubDate.replace(" ", "T")),
		description: item.description,
		image: item.thumbnail,
	}));
}