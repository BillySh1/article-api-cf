const baseURL = process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000";
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
  // Contenthash
  it("It should response 200 for vitalik.eth", async () => {
    const res = await queryClient(
      "/0xd8da6bf26964af9d7eed9e03e53415d37aa96045?limit=10&domain=vitalik.eth&contenthash=ipfs://bafybeidljrg4ble3dfpiwpcleyhl44ewz7y6mg3orpj6eivmp7lz2xchi4",
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sites?.[0].platform).toBe("website");
  });

  it("It should response 200 for 4JBz4tAKgAmxjDPHHi9HRLj14RsCQJyuCkCFKnpz7B9s", async () => {
    const res = await queryClient(
      "/4JBz4tAKgAmxjDPHHi9HRLj14RsCQJyuCkCFKnpz7B9s?limit=10&domain=planetable.sol&contenthash=ipns://k51qzi5uqu5dgv8kzl1anc0m74n6t9ffdjnypdh846ct5wgpljc7rulynxa74a",
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sites?.[0].platform).toBe("website");
  });
  // Mirror
  it("It should response 200 for bradgao.eth", async () => {
    const res = await queryClient(
      "/0xa75e8c75f193ee0079f6c75ca7fcbe79c40c517f?limit=10",
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sites?.some((x) => x.platform === "mirror")).toBeTruthy();
    expect(json.sites?.some((x) => x.platform === "paragraph")).toBeTruthy();
  });
  it("It should response 200 for kairon.eth", async () => {
    const res = await queryClient(
      "/0x0bb602f88bf886282ff69d4cec937cc2a7d9e19a?limit=10&domain=kairon.eth&contenthash=ipfs://bafkreihdajeaxsgkashwvemb5pgsyl5yr2l3x3uc3pucuhe3mxa32wk2tm",
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(
      json.items.every((x) => x.link.startsWith("https://kairon.mirror.xyz")),
    ).toBeTruthy();
  });

  it("It should response 200 for 0x934b510d4c9103e6a87aef13b816fb080286d649", async () => {
    const res = await queryClient(
      "/0x934b510d4c9103e6a87aef13b816fb080286d649?limit=10",
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sites?.[0].platform).toBe("mirror");
  });
});
