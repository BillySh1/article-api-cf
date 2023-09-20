import { sliceString } from "@/utils/string";
import { NextResponse } from "next/server";
import striptags from "striptags";
export const runtime = "edge";

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
interface ArticleItem {
  category: string[];
  created: number;
  enclosures?: string[];
  link: string;
  published: number;
  title: string;
  content?: string;
  content_encoded?: string;
  url?: string;
  guid?: string;
  description?: string;
  content_html?: string;
  summary?: string;
}
interface ErrorResponseInterface {
  query: string;
  error: string;
  code: number;
  headers?: HeadersInit;
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

const rssToJson = async (rssURL: string) => {
  try {
    const fetchURL =
      "https://rss-to-json-serverless-api.vercel.app/api?feedURL=" + rssURL;
    const res = await fetch(fetchURL).then((response) => response.json());
    return res;
  } catch (e) {
    console.log(e, "error occurs when convert rss to json");
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
const errorHandle = (props: ErrorResponseInterface) => {
  return new Response(
    JSON.stringify({
      query: props.query,
      error: props.error,
    }),
    {
      status: props.code,
      headers: {
        "Cache-Control": "no-store",
        ...props.headers,
      },
    }
  );
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const mode = searchParams.get("mode") || "full";
  const limit =
    Number(searchParams.get("limit")) > 10
      ? 10
      : Number(searchParams.get("limit")) || 10;
  if (!query)
    return errorHandle({
      error: ErrorMessages.emptyQuery,
      code: 404,
      query: "",
    });
  if (
    query.includes("https") &&
    !isValidURL(query) &&
    !regexEns.test(query) &&
    !regexDotbit.test(query)
  ) {
    return errorHandle({
      error: ErrorMessages.invalidQuery,
      code: 404,
      query,
    });
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
  if (!rssURL)
    return errorHandle({
      error: ErrorMessages.notFound,
      code: 404,
      query,
    });
  const rssJSON = await rssToJson(rssURL);
  if (!rssJSON)
    return errorHandle({
      error: ErrorMessages.notFound,
      code: 404,
      query,
    });

  try {
    // limit
    const responseBody = {
      ...rssJSON,
      title: resolveInnerHTML(rssJSON.title ?? ""),
      description: resolveInnerHTML(rssJSON.description ?? ""),
      items: rssJSON?.items?.slice(0, limit),
    };
    // mode && refactor
    responseBody?.items.map((x: ArticleItem) => {
      delete x.content_encoded;
      delete x.guid;
      delete x.url;
      if (mode === "list") {
        delete x.content;
        delete x.content_html;
        delete x.enclosures;
      }
      if (x.description || x.summary)
        x.description = resolveInnerHTML(x.description || x.summary);
      delete x.summary;

      if (x.title) x.title = resolveInnerHTML(x.title);
    });

    return NextResponse.json(responseBody, {
      status: 200,
      headers: {
        "Cache-Control": `public, s-maxage=${
          60 * 60 * 24
        }, stale-while-revalidate=${60 * 30}`,
      },
    });
  } catch (e) {
    return errorHandle({
      error: (e as { message: string }).message,
      code: 500,
      query,
    });
  }
}
