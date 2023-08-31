import { NextResponse } from "next/server";
export const runtime = "edge";

enum ErrorMessages {
  notFound = "Not Found",
  emptyQuery = "Empty Query",
  invalidQuery = "Invalid Query",
}

interface ErrorResponseInterface {
  query: string;
  error: string;
  code: number;
  headers?: HeadersInit;
}

const regexEns = /.*\.(eth|xyz|app|luxe|kred|art|ceo|club)$/i;

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
    console.log(fetchURL, "kkk");
    const res = await fetch(fetchURL).then((response) => response.json());
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
  if (!query)
    return errorHandle({
      error: ErrorMessages.emptyQuery,
      code: 404,
      query: "",
    });
  if (!isValidURL(query) && !regexEns.test(query)) {
    return errorHandle({
      error: ErrorMessages.invalidQuery,
      code: 404,
      query,
    });
  }
  const fetchURL = regexEns.test(query) ? query + ".limo" : query;
  const rssURL = await fetchRSSURL(fetchURL);
  if (!rssURL)
    return errorHandle({
      error: ErrorMessages.notFound,
      code: 404,
      query,
    });
  const rssJSON = await rssToJson(rssURL);
  try {
    return NextResponse.json(rssJSON);
  } catch (e) {
    return errorHandle({
      error: (e as { message: string }).message,
      code: 500,
      query,
    });
  }
}
