// Copy into the PLATFORM backend, never into its frontend.
// No dependencies; compatible with Express and Node.js 21.7.3.
export function createSabitoSessionHandler({
  sabitoUrl, clientId, clientSecret, platformOrigin,
  getAuthenticatedUser, verifyCsrf, fetchImpl = fetch,
}) {
  const upstream = new URL(sabitoUrl);
  const origin = new URL(platformOrigin);
  const local = url => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  for (const url of [upstream, origin]) {
    if (url.username || url.password || url.search || url.hash ||
        url.pathname !== "/" || (url.protocol !== "https:" && !(url.protocol === "http:" && local(url)))) {
      throw new Error("SABITO_INVALID_ORIGIN");
    }
  }
  if (!clientId || !clientSecret || typeof getAuthenticatedUser !== "function" ||
      typeof verifyCsrf !== "function") throw new Error("SABITO_BRIDGE_NOT_CONFIGURED");
  const authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  return async function sabitoSession(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    const fail = (status, error) => res.status(status).json({ error });
    if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED");
    if (req.headers.origin !== origin.origin) return fail(403, "ORIGIN_DENIED");
    try {
      if (await verifyCsrf(req) !== true) return fail(403, "CSRF_DENIED");
      // Must check the CURRENT platform session (including revocation), not body/query.
      const user = await getAuthenticatedUser(req);
      if (!user || typeof user.id !== "string" || !user.id.trim() || user.id.length > 191) {
        return fail(401, "AUTHENTICATION_REQUIRED");
      }
      const response = await fetchImpl(new URL("/v1/auth/token", upstream), {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(10000),
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: JSON.stringify({ external_user_id: user.id }),
      });
      if (!response.ok) return fail(502, "SABITO_SESSION_UNAVAILABLE");
      const payload = await response.json();
      const data = payload?.data;
      if (!payload?.success || typeof data?.access_token !== "string" ||
          !data.access_token || data.access_token.length > 16384 ||
          !Number.isFinite(data.expires_in) || data.expires_in <= 0 || data.expires_in > 900 ||
          data.external_user_id !== user.id || data.identity_type !== "platform_user") {
        return fail(502, "SABITO_INVALID_RESPONSE");
      }
      // Allowlist the response: never proxy credentials or arbitrary upstream fields.
      return res.json({
        access_token: data.access_token, expires_in: data.expires_in,
        socket_path: "/socket.io", external_user_id: user.id,
      });
    } catch {
      // Network exceptions can contain URLs/headers. Never return or log them.
      return fail(503, "SESSION_UNAVAILABLE");
    }
  };
}
