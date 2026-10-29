export function platformTitle(name = "") {
  const platform = name.trim();
  return /^sabito/i.test(platform) ? platform : `Sabito${platform}`;
}
