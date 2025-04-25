import { NextRequest, NextResponse } from "next/server";
import {
  isValidEthereumAddress,
  isValidSolanaAddress,
  regexDomain,
} from "./utils";
import getRSSResponse from "./rss";
import parse from "./parse";

export const runtime = "edge";

const BASE_URLS = {
  MIRROR: "https://mirror.xyz",
  PARAGRAPH: "https://paragraph.com",
  PROFILE_API: "https://api.web3.bio",
};

const ARTICLE_PLATFORMS = {
  CONTENTHASH: "website",
  PARAGRAPH: "paragraph",
  MIRROR: "mirror",
};

const subStr = (str: string) => {
  if (!str) return "";
  return str.length > 100 ? `${str.substring(0, 80)}...` : str;
};

const fetchRss = async (handle: string): Promise<any> => {
  try {
    return await getRSSResponse({ query: handle, mode: "list", limit: 10 });
  } catch (e) {
    console.error("Error fetching RSS:", e);
    return null;
  }
};

const fetchArticle = async (address: string, limit: number) => {
  const response = await fetch("https://api.firefly.land/article/v1/article", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses: [address], limit }),
  })
    .then((res) => res.json())
    .catch(() => null);
  return response || [];
};

const processMirrorRSS = async (ensName: string) => {
  try {
    const mirrorRSS = await parse(`https://mirror.xyz/${ensName}/feed/atom`);
    if (!mirrorRSS) return null;
    return {
      site: {
        platform: ARTICLE_PLATFORMS.MIRROR,
        name: mirrorRSS.title || `${ensName}'s Mirror`,
        description: mirrorRSS.description || "",
        image: mirrorRSS.image || "",
        link: mirrorRSS.link || `${BASE_URLS.MIRROR}/${ensName}`,
      },
      items: (mirrorRSS.items || []).map((item: any) => ({
        title: item.title,
        link: item.link,
        description: item.description,
        published: new Date(item.published).getTime(),
        body: item.body || item.content,
        platform: ARTICLE_PLATFORMS.MIRROR,
      })),
    };
  } catch (error) {
    console.error("Error processing Mirror RSS:", error);
    return null;
  }
};

const processParagraphRSS = async (username: string) => {
  try {
    const paragraphRSS = await parse(
      `https://api.paragraph.com/blogs/rss/@${username}`,
    );
    if (!paragraphRSS) return null;
    return {
      site: {
        platform: ARTICLE_PLATFORMS.PARAGRAPH,
        name: paragraphRSS.title || `${username}'s Paragraph`,
        description: paragraphRSS.description || "",
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
    console.error("Error processing Paragraph RSS:", error);
    return null;
  }
};

const processContenthashResults = async (resolvedDomain: string) => {
  const rssArticles = await fetchRss(resolvedDomain);
  if (!rssArticles?.items) return { items: [], site: null };

  return {
    items: rssArticles.items.map((x: any) => ({
      title: x.title,
      link: x.link,
      description: x.description,
      published: new Date(x.published).getTime(),
      body: x.body,
      platform: ARTICLE_PLATFORMS.CONTENTHASH,
    })),
    site: {
      platform: ARTICLE_PLATFORMS.CONTENTHASH,
      name: rssArticles.title,
      description: rssArticles.description,
      image: rssArticles.image,
      link: rssArticles.link,
    },
  };
};

const extractPlatformInfo = (fireflyArticles: any[], ensName: string) => {
  const mirrorItems = new Array();
  const paragraphItems = new Array();
  let paragraphUsername = "";
  fireflyArticles?.forEach((x: any) => {
    const content = JSON.parse(x.content_body);
    const published = x.content_timestamp * 1000;

    if (x.platform === 1) {
      mirrorItems.push({
        title: content.content.title,
        link: `${BASE_URLS.MIRROR}/${ensName}/${x.original_id}`,
        description: subStr(content.content.body),
        published,
        body: content.content.body,
        platform: ARTICLE_PLATFORMS.MIRROR,
      });
    } else if (x.platform === 2) {
      // Extract paragraph username from URL if available
      if (content.url && !paragraphUsername) {
        paragraphUsername = content.url.includes("@")
          ? content.url.match(
              /paragraph\.(?:com|xyz)\/@([a-zA-Z0-9_\.-]+)/,
            )?.[1]
          : regexDomain.exec(content.url)?.[1];
      }

      paragraphItems.push({
        title: content.title,
        link: content.url
          ? `https://${content.url}`
          : `${BASE_URLS.PARAGRAPH}/@${paragraphUsername}/${content.slug}`,
        description: subStr(content.markdown),
        published,
        body: content.markdown,
        platform: ARTICLE_PLATFORMS.PARAGRAPH,
      });
    }
  });

  return { paragraphItems, mirrorItems, paragraphUsername };
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address")?.toLowerCase() || "";
  const domain = searchParams.get("domain") || "";
  const contenthash = searchParams.get("contenthash") || "";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!address || !domain) {
    return NextResponse.json({ sites: [], items: [], error: "Invalid Param" });
  }

  const result: { sites: any[]; items: any[] } = { sites: [], items: [] };
  if (contenthash) {
    const contenthashResult = await processContenthashResults(domain);
    if (contenthashResult?.items?.length > 0) {
      result.items.push(...contenthashResult.items);
      result.sites.push(contenthashResult.site);
    }
  }

  if (isValidEthereumAddress(address)) {
    const fireflyResponse = await fetchArticle(address, limit);
    const { mirrorItems, paragraphItems, paragraphUsername } =
      extractPlatformInfo(fireflyResponse.data, domain);
    // resolve paragraph
    if (paragraphItems?.length > 0) {
      const paragraphUser = paragraphUsername || domain;
      const paragraphRssJson = await processParagraphRSS(paragraphUser);
      if (paragraphRssJson) {
        result.sites.push(paragraphRssJson.site);
        const paragraphArticles = paragraphRssJson.items.map((item: any) => ({
          ...item,
          platform: ARTICLE_PLATFORMS.PARAGRAPH,
        }));
        result.items.push(...paragraphArticles);
      } else {
        result.sites.push({
          platform: ARTICLE_PLATFORMS.PARAGRAPH,
          name: `${paragraphUser}'s Paragraph`,
          description: "",
          image: "",
          link: `${BASE_URLS.PARAGRAPH}/@${paragraphUser}`,
        });
        result.items.push(...paragraphItems);
      }
    }
    // resolve mirror
    const mirrorResults = await processMirrorRSS(domain);
    if (mirrorResults) {
      result.sites.push(mirrorResults.site);
      const mirrorArticles = mirrorResults.items.map((item: any) => ({
        ...item,
        platform: ARTICLE_PLATFORMS.MIRROR,
      }));
      result.items.push(...mirrorArticles);
    }
    if (mirrorItems) {
      result.sites.push({
        platform: ARTICLE_PLATFORMS.MIRROR,
        name: `${domain}'s Mirror`,
        description: "",
        image: "",
        link: `${BASE_URLS.MIRROR}/${domain}`,
      });
      result.items.push(...mirrorItems);
    }
  }

  result.items = result.items
    .sort((a, b) => b.published - a.published)
    .slice(0, limit);

  result.sites = result.sites.filter((x) =>
    result.items.some((i) => i.platform === x.platform),
  );

  return NextResponse.json(result, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
