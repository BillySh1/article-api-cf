export function sliceString(txt: string, maxLength: number = 140) {
  if (txt.length <= maxLength) return txt;
  return txt.slice(0, maxLength) + "…";
}
