import { queryClient } from "../utils/test-utils";

describe("Test For Rss Fetcher ", () => {
  it("It should response 200 for ENS domain", async () => {
    const res = await queryClient("/api/rss?query=sujiyan.eth");
    expect(res.status).toBe(200);
  });
  it("It should response 200 for custom domain without https", async () => {
    const res = await queryClient("/api/rss?query=vitalik.ca");
    expect(res.status).toBe(200);
  });
  it("It should response 200 for custom full domain", async () => {
    const res = await queryClient("/api/rss?query=https://vitalik.ca");
    expect(res.status).toBe(200);
  });
  it("It should response 200 for .bit domain", async () => {
    const res = await queryClient("/api/rss?query=planetable.bit&mode=list");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items.length).toBe(10);
  });
});
