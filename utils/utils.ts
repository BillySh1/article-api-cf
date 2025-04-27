import { isAddress } from "viem";

export const regexEns = /.*?\.(eth|xyz|app|luxe|kred|art|ceo|club)$/i,
  regexLens = /.*\.lens$/i,
  regexDotbit = /.*\.bit$/i,
  regexEth = /^0x[a-fA-F0-9]{40}$/i,
  regexBtc = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/i,
  regexSns = /.*\.(sol)$/i,
  regexSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/i,
  regexTwitter = /^[A-Za-z0-9_]{1,15}$/i,
  regexFarcaster = /^[A-Za-z0-9_-]{1,61}(?:|\.eth)(?:|\.farcaster)$/i,
  regexUnstoppableDomains =
    /.*\.(crypto|888|nft|blockchain|bitcoin|dao|x|klever|hi|zil|kresus|polygon|wallet|binanceus|anime|go|manga|eth)$/i,
  regexSpaceid = /.*\.(bnb|arb)$/i,
  regexCrossbell = /.*\.csb$/i,
  regexAvatar = /^0x[a-f0-9]{66}$/i,
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

export const isValidURL = (str: string) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
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
