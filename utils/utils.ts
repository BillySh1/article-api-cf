import { isAddress } from "viem";

export const regexSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/i,
  regexDomain = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/\n]+)/;

export const isValidEthereumAddress = (address: string) => {
  if (!isAddress(address)) return false; // invalid Ethereum address
  if (address.match(/^0x0*.$|0x[123468abef]*$|0x0*dead$/i)) return false; // empty & burn address
  return true;
};

export const isValidSolanaAddress = (address: string) => {
  if (!regexSolana.test(address)) return false; // invalid Solana address
  return true;
};

export const BASE_URLS = {
  MIRROR: "https://mirror.xyz",
  PARAGRAPH: "https://paragraph.com",
};

export const ARTICLE_PLATFORMS = {
  CONTENTHASH: "website",
  PARAGRAPH: "paragraph",
  MIRROR: "mirror",
};
