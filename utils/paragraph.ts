import parse from "./parse";
import { formatContent } from "./string";
import { ARTICLE_PLATFORMS, BASE_URLS, regexDomain } from "./utils";

const fetchFirefly = async (address: string, limit: number) => {
  try {
    const response = await fetch(
      "https://api.firefly.land/article/v1/article",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: [address], limit }),
      },
    );
    const data = await response.json();
    return data || { data: [] };
  } catch (error) {
    return { data: [] };
  }
};

const getParagraphUsername = async (address: string) => {
  const fireflyResponse = await fetchFirefly(address, 20);
  const freflyArticles = fireflyResponse.data || [];
  let paragraphUsername = "";
  if (!freflyArticles.length) return { username: "", paragraphItems: [] };
  const paragraphItems = new Array();
  freflyArticles.forEach((x: any) => {
    const content = JSON.parse(x.content_body);
    const published = x.content_timestamp * 1000;
    if (x.platform === 2 && content.url && !paragraphUsername) {
      paragraphUsername = content.url.includes("@")
        ? content.url.match(/paragraph\.(?:com|xyz)\/@([a-zA-Z0-9_\.-]+)/)?.[1]
        : regexDomain.exec(content.url)?.[1];
    }
    if (x.platform === 2) {
      paragraphItems.push({
        title: content.title,
        link: content.url
          ? `https://${content.url}`
          : `${BASE_URLS.PARAGRAPH}/@${paragraphUsername || address}/${content.slug}`,
        description: formatContent(content.markdown),
        published,
        body: content.markdown,
        platform: ARTICLE_PLATFORMS.PARAGRAPH,
      });
    }
  });
  return { username: paragraphUsername, paragraphItems };
};

export const processParagraphResults = async (address: string) => {
  try {
    const { username, paragraphItems } = await getParagraphUsername(address);
    if (!username) return null;
    const paragraphRSS = await parse(
      `https://api.paragraph.com/blogs/rss/@${username}`,
    );
    if (!paragraphRSS)
      return {
        site: {
          platform: ARTICLE_PLATFORMS.PARAGRAPH,
          name: `${username}'s Paragraph`,
          description: "",
          image: "",
          link: `${BASE_URLS.PARAGRAPH}/@${username}`,
        },
        items: paragraphItems,
      };
    return {
      site: {
        platform: ARTICLE_PLATFORMS.PARAGRAPH,
        name: paragraphRSS.title || `${username}'s Paragraph`,
        description:
          paragraphRSS.description === "undefined"
            ? ""
            : paragraphRSS.description || "",
        image: paragraphRSS.image || "",
        link: paragraphRSS.link || `${BASE_URLS.PARAGRAPH}/@${username}`,
      },
      items: (paragraphRSS.items || []).map((item: any) => ({
        title: item.title,
        link: item.link,
        description: item.description,
        published: new Date(item.published).getTime(),
        body: item.body || item.content,
        platform: ARTICLE_PLATFORMS.PARAGRAPH,
      })),
    };
  } catch (error) {
    return null;
  }
};
