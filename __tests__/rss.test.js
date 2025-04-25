const baseURL = process.env.NEXT_PUBLIC_VERCEL_RUL || "http://localhost:3000";
const queryClient = async (path) => {
  return await fetch(baseURL + path);
};

describe("Test For Rss Fetcher ", () => {
  // Paragraph
  it("It should response 200 for 0xf1268b5eae72617ddb2cfcaa82d379155b675dfd", async () => {
    const res = await queryClient(
      "/0xf1268b5eae72617ddb2cfcaa82d379155b675dfd?limit=10",
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sites?.[0]?.link).toBe(
      "https://paragraph.com/@pioneering-spirit",
    );
  });
  it("It should response 200 for 0x742b97dc68bcc3475feb734c2df2c76f25664532", async () => {
    const res = await queryClient(
      "/0x742b97dc68bcc3475feb734c2df2c76f25664532?limit=10",
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sites?.[0]?.link).toBe("https://paragraph.com/@jamesbeck.eth");
  });
  it("It should response 200 for 0xc9ddb5e37165827bbbff15b582e232c06862c4e8", async () => {
    const res = await queryClient(
      "/0xc9ddb5e37165827bbbff15b582e232c06862c4e8?limit=10",
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sites?.[0]?.link).toBe("https://paragraph.com/@blog");
  });
});
