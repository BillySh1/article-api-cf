import { sliceString } from "@/utils/string";
import { NextResponse } from "next/server";
import striptags from "striptags";

const escapeRegex = /[\\/\b\f\n\r\t\v]/g;

const resolveInnerHTML = (content: string | undefined) => {
  return typeof content === "string"
    ? sliceString(striptags(content || "").replaceAll(escapeRegex, ""), 140)
        .trim()
        .replace(/\s{2,}/g, " ") || ""
    : "";
};

enum ErrorMessages {
  notFound = "Not Found",
  emptyQuery = "Empty Query",
  invalidQuery = "Invalid Query",
}

const regexEns = /.*\.(eth|xyz|app|luxe|kred|art|ceo|club)$/i,
  regexDotbit = /.*\.bit$/i,
  regexDomain =
    /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/g;

const fetchRSSURL = async (url: string) => {
  try {
    const fetchURL =
      "https://public-api.wordpress.com/rest/v1.1/read/feed/?url=" + url;
    const res = await fetch(fetchURL).then((response) => response.json());
    return res.feeds?.[0].subscribe_URL;
  } catch (e) {
    console.log(e, "error occurs when fetching rss url");
    return null;
  }
};

const isValidURL = (str: string) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

export default async function getRSS(props: any) {
  const { query, mode = "list", limit = 10 } = props;

  if (!query) throw new Error(ErrorMessages.emptyQuery);
  if (
    query.includes("https") &&
    !isValidURL(query) &&
    !regexEns.test(query) &&
    !regexDotbit.test(query)
  ) {
    throw new Error(ErrorMessages.invalidQuery);
  }
  const fetchURL = (() => {
    switch (!!query) {
      case regexEns.test(query):
        return query + ".limo";
      case regexDotbit.test(query):
        return query + ".cc";
      case regexDomain.test(query):
        return query.startsWith("https://") || query.startsWith("http://")
          ? query
          : "https://" + query;
      default:
        return query;
    }
  })();

  const rssURL = await fetchRSSURL(fetchURL);
  if (!rssURL) throw new Error(ErrorMessages.notFound);
  const { parse } = require("rss-to-json");
  const rssJSON = await parse(rssURL);
  if (!rssJSON?.items) throw new Error(ErrorMessages.notFound);
  delete rssJSON.category;
  try {
    // limit
    const responseBody = {
      ...rssJSON,
      title: resolveInnerHTML(rssJSON.title ?? ""),
      description: resolveInnerHTML(rssJSON.description ?? ""),
      link: rssJSON.link,
      items: rssJSON?.items?.slice(0, limit),
    };
    // mode && refactor
    responseBody?.items.map((x: any) => {
      delete x.id;
      delete x.author;
      if (mode === "list") {
        delete x.content;
        delete x.content_html;
        delete x.enclosures;
        delete x.category;
        delete x.media;
      }
      if (x.description || x.summary)
        x.description = resolveInnerHTML(x.description || x.summary);
      delete x.summary;

      if (x.title) x.title = resolveInnerHTML(x.title);
    });
    return responseBody;
  } catch (e: any) {
    throw new Error(e.message);
  }
}
