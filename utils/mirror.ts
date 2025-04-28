import parse from "./parse";
import { formatText } from "./string";
import { ARTICLE_PLATFORMS, BASE_URLS } from "./utils";

export const processMirrorResults = async (address: string) => {
  try {
    const mirrorRSS = await parse(`${BASE_URLS.MIRROR}/${address}/feed/atom`);
    if (!mirrorRSS) return null;
    return {
      site: {
        platform: ARTICLE_PLATFORMS.MIRROR,
        name: mirrorRSS.title || `${formatText(address)}'s Mirror`,
        description: mirrorRSS.description || "",
        image: mirrorRSS.image || "",
        link: mirrorRSS.link || `${BASE_URLS.MIRROR}/${address}`,
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
    return null;
  }
};
