import { NextResponse } from "next/server";
export const runtime = "edge";

enum ErrorMessages {
  notFound = "Not Found",
  emptyQuery = "Empty Query",
  invalidQuery = "Invalid Query",
}
interface ArticleItem {
  category: string[];
  created: number;
  description: string;
  enclosures: string[];
  link: string;
  published: number;
  title: string;
  content?: string;
  content_encoded?: string;
  url?: string;
}
interface ErrorResponseInterface {
  query: string;
  error: string;
  code: number;
  headers?: HeadersInit;
}

const regexEns = /.*\.(eth|xyz|app|luxe|kred|art|ceo|club)$/i;
const regexDOmain =
  /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/g;

const fetchRSSURL = async (url: string) => {
  try {
    const fetchURL =
      "https://public-api.wordpress.com/rest/v1.1/read/feed/?url=" + url;
    const res = await fetch(fetchURL, {
      mode: "no-cors",
      cache: "no-store",
    }).then((response) => response.json());
    console.log(res.feeds, "kkkk");
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
    console.log("json:", res);
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
      : Number(searchParams.get("limit"));
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
    : regexDOmain.test(query)
    ? "https://" + query
    : query;
  const rssURL = await fetchRSSURL(fetchURL);
  if (!rssURL)
    return errorHandle({
      error: ErrorMessages.notFound,
      code: 404,
      query,
    });
  console.log(rssURL, "rssURL");
  const rssJSON = await rssToJson(rssURL);
  if (!rssJSON)
    return errorHandle({
      error: ErrorMessages.notFound,
      code: 404,
      query,
    });

  try {
    const resOBJ = JSON.parse(rssJSON)
    // limit
    resOBJ?.items.slice(0, limit - 1);
    // mode && refactor
    resOBJ?.items.map((x: ArticleItem) => {
      delete x.content_encoded;
      delete x.url;
      if (mode === "list") {
        delete x.content;
      }
      return x;
    });

    return NextResponse.json(resOBJ);
  } catch (e) {
    return errorHandle({
      error: (e as { message: string }).message,
      code: 500,
      query,
    });
  }
}
