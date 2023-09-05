import { sliceString } from "@/utils/string";
import { NextResponse } from "next/server";
import striptags from "striptags";
export const runtime = "edge";

const escapeRegex = /[\\/\b\f\n\r\t\v]/g;

const resolveInnerHTML = (content: string | undefined) => {
  return typeof content === "string"
    ? sliceString(striptags(content || "").replaceAll(escapeRegex, ""), 140) ||
        ""
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
  enclosures: string[];
  link: string;
  published: number;
  title: string;
  content?: string;
  content_encoded?: string;
  url?: string;
  description?: string;
}
interface ErrorResponseInterface {
  query: string;
  error: string;
  code: number;
  headers?: HeadersInit;
}

const regexEns = /.*\.(eth|xyz|app|luxe|kred|art|ceo|club)$/i;
const regexDomain =
  /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/g;

const fetchRSSURL = async (url: string) => {
  try {
    const fetchURL =
      "https://public-api.wordpress.com/rest/v1.1/read/feed/?url=" + url;
    const res = await fetch(fetchURL, {
      mode: "no-cors",
      cache: "no-store",
    }).then((response) => response.json());

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
    const res = await fetch(fetchURL, {
      mode: "no-cors",
      cache: "no-store",
    }).then((response) => response.json());
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
  if (query.includes("https") && !isValidURL(query) && !regexEns.test(query)) {
    return errorHandle({
      error: ErrorMessages.invalidQuery,
      code: 404,
      query,
    });
  }
  const fetchURL = regexEns.test(query)
    ? query + ".limo"
    : regexDomain.test(query)
    ? "https://" + query
    : query;
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
      items: rssJSON?.items.slice(0, limit),
    };
    // mode && refactor
    responseBody?.items.map((x: ArticleItem) => {
      delete x.content_encoded;
      delete x.url;
      if (mode === "list") {
        delete x.content;
      }
      x.description = resolveInnerHTML(x.description);
      x.title = resolveInnerHTML(x.title)
    });

    return NextResponse.json(responseBody);
  } catch (e) {
    return errorHandle({
      error: (e as { message: string }).message,
      code: 500,
      query,
    });
  }
}
