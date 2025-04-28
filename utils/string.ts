export const sliceString = (txt: string, maxLength: number = 140) => {
  if (txt.length <= maxLength) return txt;
  return txt.slice(0, maxLength) + "…";
};
export const formatText = (string: string, length?: number) => {
  if (!string) return "";
  const len = length ?? 12;
  const chars = len / 2 - 2;
  if (string.length <= len) {
    return string;
  }
  if (string.startsWith("0x")) {
    return `${string.substring(0, chars + 2)}...${string.substring(
      string.length - chars,
    )}`;
  } else {
    return `${string.substring(0, chars + 1)}...${string.substring(
      string.length - (chars + 1),
    )}`;
  }
};

export const formatContent = (str: string) => {
  if (!str) return "";
  return str.length > 100 ? `${str.substring(0, 80)}...` : str;
};
