export function platformTitle(name = "") {
  const platform = name.trim().replace(/^sabito\s*/i, "");
  return platform ? `Sabito ${platform}` : "Sabito";
}
