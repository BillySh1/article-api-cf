import { processMirrorResults } from "@/utils/mirror";
import { processParagraphResults } from "@/utils/paragraph";
import { processContenthashResults } from "@/utils/rss";
import {
  ARTICLE_PLATFORMS,
  isValidEthereumAddress,
  isValidSolanaAddress,
} from "@/utils/utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address") || "";
  const domain = searchParams.get("domain") || "";
  const contenthash = searchParams.get("contenthash") || "";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!isValidEthereumAddress(address) && !isValidSolanaAddress(address)) {
    return NextResponse.json({ sites: [], items: [], error: "Invalid Param" });
  }

  const result: { sites: any[]; items: any[] } = { sites: [], items: [] };

  // Promises
  const parallelTasks = {
    [ARTICLE_PLATFORMS.MIRROR]: {},
    [ARTICLE_PLATFORMS.PARAGRAPH]: {},
    [ARTICLE_PLATFORMS.CONTENTHASH]: {},
  };

  if (isValidEthereumAddress(address)) {
    parallelTasks.mirror = processMirrorResults(address.toLowerCase());
    parallelTasks.paragraph = processParagraphResults(address.toLowerCase());
  }

  if (contenthash && domain) {
    parallelTasks.contenthash = processContenthashResults(domain);
  }

  // parallel tasks execution
  const validTasks = Object.entries(parallelTasks)
    .filter(
      ([_, promise]: any) => promise && typeof promise.then === "function",
    )
    .map(([key, promise]: any) => promise.then((data: any) => ({ key, data })));

  const taskResults = await Promise.allSettled(validTasks);
  const resolvedTasks = taskResults.reduce((acc: any, result) => {
    if (result.status === "fulfilled" && result.value?.data) {
      acc[result.value.key] = result.value.data;
    }
    return acc;
  }, {});

  Object.keys(resolvedTasks).forEach((key) => {
    const platformItem = resolvedTasks[key] as any;
    if (platformItem.items?.length > 0) {
      result.sites.push(platformItem.site);
      result.items.push(...platformItem.items);
    }
  });

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

export const runtime = "edge";
