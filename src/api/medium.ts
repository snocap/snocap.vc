export type MediumPost = {
  source: "medium";
  title: string;
  link: string;
  published: Date;
  description: string;
  image: string;
};

export async function fetchRecentPosts(): Promise<MediumPost[]> {
  const url =
    "https://api.rss2json.com/v1/api.json?rss_url=https://medium.com/feed/snocap";
  // The RSS proxy is a third party and returns transient 5xx responses. A news
  // fetch failure must never fail the whole static build — degrade to an empty
  // feed and let the deploy proceed.
  try {
    const response = await fetch(url);
    const body = await response.json();
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
  } catch (error) {
    console.warn(`[medium] skipping news feed: ${error}`);
    return [];
  }
}
