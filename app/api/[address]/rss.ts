import { sliceString } from "@/utils/string";
import parse from "./parse";
import striptags from "striptags";

const ESCAPE_REGEX = /[\\/\b\f\n\r\t\v]/g;
const WHITESPACE_REGEX = /\s{2,}/g;
const MAX_DESCRIPTION_LENGTH = 140;

const resolveInnerHTML = (
  content: string | undefined,
  slice?: boolean
): string => {
  if (typeof content !== "string") return "";
  const he = require("he");
  const contentStr = he.decode(
    striptags(content)
      .replace(ESCAPE_REGEX, "")
      .trim()
      .replace(WHITESPACE_REGEX, " ")
  );
  return slice ? sliceString(contentStr, MAX_DESCRIPTION_LENGTH) : contentStr;
};

enum ErrorMessages {
  NotFound = "Not Found",
  EmptyQuery = "Empty Query",
  InvalidQuery = "Invalid Query",
}

const REGEX_ENS = /.*\.(eth|xyz|app|luxe|kred|art|ceo|club)$/i;
const REGEX_DOTBIT = /.*\.bit$/i;
const REGEX_SNS = /.*\.(sol)$/i;
const REGEX_DOMAIN =
  /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/g;

const fetchRSSURL = async (url: string): Promise<string | null> => {
  try {
    const fetchURL = `https://public-api.wordpress.com/rest/v1.1/read/feed/?url=${url}`;
    const res = await fetch(fetchURL).then((response) => response.json());
    return res.feeds?.[0].subscribe_URL ?? null;
  } catch (e) {
    console.error("Error occurs when fetching RSS URL:", e);
    return null;
  }
};

const isValidURL = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

const getFetchURL = (query: string): string => {
  if (REGEX_ENS.test(query)) return `${query}.limo`;
  if (REGEX_DOTBIT.test(query)) return `${query}.cc`;
  if (REGEX_SNS.test(query)) return `${query}.build`;
  if (REGEX_DOMAIN.test(query)) {
    return query.startsWith("https://") || query.startsWith("http://")
      ? query
      : `https://${query}`;
  }
  return query;
};

interface RSSItem {
  title?: string;
  description?: string;
  summary?: string;
  content?: string;
  content_html?: string;
  enclosures?: any;
  category?: any;
  media?: any;
  [key: string]: any;
}

interface RSSFeed {
  title?: string;
  description?: string;
  link?: string;
  items?: RSSItem[];
  [key: string]: any;
}

export default async function getRSS(props: {
  query: string;
  mode?: "list" | "full";
  limit?: number;
}): Promise<RSSFeed> {
  const { query, mode = "list", limit = 10 } = props;

  if (!query) throw new Error(ErrorMessages.EmptyQuery);
  if (
    query.includes("https") &&
    !isValidURL(query) &&
    !REGEX_ENS.test(query) &&
    !REGEX_DOTBIT.test(query)
  ) {
    throw new Error(ErrorMessages.InvalidQuery);
  }

  const fetchURL = getFetchURL(query);
  const rssURL = await fetchRSSURL(fetchURL);
  if (!rssURL) throw new Error(ErrorMessages.NotFound);

  const rssJSON: RSSFeed | null = await parse(rssURL);
  if (!rssJSON?.items) throw new Error(ErrorMessages.NotFound);
  delete rssJSON.category;

  const responseBody: RSSFeed = {
    ...rssJSON,
    title: resolveInnerHTML(rssJSON.title, true),
    description: resolveInnerHTML(rssJSON.description, true),
    link: rssJSON.link,
    items: rssJSON.items.slice(0, limit).map((item: RSSItem) => {
      const newItem: RSSItem = { ...item };
      delete newItem.id;
      delete newItem.author;

      if (mode === "list") {
        delete newItem.content;
        delete newItem.content_html;
        delete newItem.enclosures;
        delete newItem.category;
        delete newItem.media;
      }
      newItem.body = (newItem.description || newItem.summary)?.trim();
      newItem.description = resolveInnerHTML(
        newItem.description || newItem.summary,
        true
      );
      delete newItem.summary;

      if (newItem.title) newItem.title = resolveInnerHTML(newItem.title, true);

      return newItem;
    }),
  };

  return responseBody;
}
