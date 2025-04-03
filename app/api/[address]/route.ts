import { NextRequest, NextResponse } from "next/server";
import {
  handleSearchPlatform,
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

const resolveAddressAndDomain = async (address: string, domain: string) => {
  if (address && domain)
    return { resolvedAddress: address, resolvedDomain: domain };

  const searchPlatform = domain ? handleSearchPlatform(domain) : "ens";
  const profile = await fetch(
    `${BASE_URLS.PROFILE_API}/ns/${searchPlatform}/${domain || address}`,
  )
    .then((res) => res.json())
    .catch(() => null);

  return {
    resolvedAddress: profile?.address || address,
    resolvedDomain: profile?.identity || domain,
  };
};

const processContenthashArticles = async (resolvedDomain: string) => {
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

const processFireflyArticles = (articles: any[], resolvedDomain: string) => {
  const items: any[] = [];
  let paragraphUser = "";

  articles?.forEach((x: any) => {
    const content = JSON.parse(x.content_body);
    const published = x.content_timestamp * 1000;

    if (x.platform === 1) {
      items.push({
        title: content.content.title,
        link: `${BASE_URLS.MIRROR}/${resolvedDomain}/${x.original_id}`,
        description: subStr(content.content.body),
        published,
        body: content.content.body,
        platform: ARTICLE_PLATFORMS.MIRROR,
      });
    } else if (x.platform === 2) {
      if (content.url && !paragraphUser) {
        paragraphUser = content.url.includes("@")
          ? content.url.match(/paragraph\.com\/@([a-zA-Z0-9_\.-]+)/)?.[1]
          : regexDomain.exec(content.url)?.[1];
      }
      items.push({
        title: content.title,
        link: content.url
          ? `https://${content.url}`
          : `${BASE_URLS.PARAGRAPH}/@${resolvedDomain}/${content.slug}`,
        description: subStr(content.markdown),
        published,
        body: content.markdown,
        platform: ARTICLE_PLATFORMS.PARAGRAPH,
      });
    }
  });

  return { items, paragraphUser };
};

const fetchSiteInfo = async (
  resolvedDomain: string,
  paragraphUser: string,
  items: any[],
) => {
  const sites = [];

  if (items.some((x) => x.platform === ARTICLE_PLATFORMS.MIRROR)) {
    const mirrorSite = await parse(
      `https://mirror.xyz/${resolvedDomain}/feed/atom`,
    );
    sites.push({
      platform: ARTICLE_PLATFORMS.MIRROR,
      name: mirrorSite?.title || `${resolvedDomain}'s Mirror`,
      description: mirrorSite?.description || "",
      image: mirrorSite?.image || "",
      link: mirrorSite?.link || `${BASE_URLS.MIRROR}/${resolvedDomain}`,
    });
  }

  if (items.some((x) => x.platform === ARTICLE_PLATFORMS.PARAGRAPH)) {
    const paragraphSite = await parse(
      `https://api.paragraph.com/blogs/rss/@${paragraphUser || resolvedDomain}`,
    );
    sites.push({
      platform: ARTICLE_PLATFORMS.PARAGRAPH,
      name: paragraphSite?.title || `${resolvedDomain}'s Paragraph`,
      description:
        paragraphSite?.description === "undefined"
          ? ""
          : paragraphSite?.description || "",
      image: paragraphSite?.image || "",
      link:
        paragraphSite?.link ||
        `${BASE_URLS.PARAGRAPH}/@${paragraphUser || resolvedDomain}`,
    });
  }

  return sites;
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address")?.toLowerCase() || "";
  const domain = searchParams.get("domain") || "";
  const contenthash = searchParams.get("contenthash") || "";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (
    !(isValidEthereumAddress(address) || isValidSolanaAddress(address)) &&
    !contenthash
  ) {
    return NextResponse.json({ sites: [], items: [] });
  }

  const { resolvedAddress, resolvedDomain } = await resolveAddressAndDomain(
    address,
    domain,
  );
  const result: { sites: any[]; items: any[] } = { sites: [], items: [] };
  if (contenthash) {
    const contenthashResult = await processContenthashArticles(resolvedDomain);
    if (contenthashResult?.items?.length > 0)
      result.items.push(...contenthashResult.items);
    if (contenthashResult.site) result.sites.push(contenthashResult.site);
  }

  if (isValidEthereumAddress(resolvedAddress)) {
    const fireflyArticles = await fetchArticle(resolvedAddress, limit);
    const { items: fireflyItems, paragraphUser } = processFireflyArticles(
      fireflyArticles?.data,
      resolvedDomain,
    );
    result.items.push(...fireflyItems);

    const sites = await fetchSiteInfo(
      resolvedDomain,
      paragraphUser,
      result.items,
    );

    result.sites.push(...sites);
  }

  result.items = result.items
    .sort((a, b) => b.published - a.published)
    .slice(0, limit);

  return NextResponse.json(result, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
