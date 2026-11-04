import type { ErrorRequestHandler, RequestHandler } from "express";

// Keep the iframe exception narrow: only /widget/chat may override frame-ancestors
// after widgetFrameOrigins has validated the embedding site's exact origin.
export function contentSecurityPolicy(frameAncestors = "'none'") {
  const connections = ["'self'"];
  // Some browsers do not match wss: against connect-src 'self'. Authorize only
  // the configured public origin, never an untrusted Host / forwarded header.
  try {
    const publicUrl = new URL(process.env.PUBLIC_URL ?? "");
    if (publicUrl.protocol === "https:" && !publicUrl.username && !publicUrl.password) {
      connections.push(publicUrl.origin, publicUrl.origin.replace(/^https:/, "wss:"));
    }
  } catch { /* A relative same-origin connection remains allowed. */ }
  return [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connections.join(" ")}`,
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");
}

export const securityHeaders: RequestHandler = (req, res, next) => {
  res.setHeader("Content-Security-Policy", contentSecurityPolicy());
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  // Do not apply X-Frame-Options to the embeddable chat. Its dynamic CSP is stricter
  // and also permits explicitly authorized BCA / Buzz Booster parent origins.
  if (req.path !== "/widget/chat") res.setHeader("X-Frame-Options", "DENY");
  if (req.secure) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
  }
  if (req.headers.authorization || req.headers["x-admin-key"]) {
    res.setHeader("Cache-Control", "no-store");
  }
  next();
};

// Never return parser internals, SQL details, stack traces or upstream secrets.
export const safeHttpErrors: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) { next(error); return; }
  const type = typeof error?.type === "string" ? error.type : "";
  if (type === "entity.too.large" || type === "parameters.too.many") {
    res.status(413).json({ success: false, message: "La requête dépasse la limite technique. Aucune donnée n’a été enregistrée partiellement." });
    return;
  }
  if (type === "encoding.unsupported" || type === "charset.unsupported") {
    res.status(415).json({ success: false, message: "Encodage de requête non pris en charge." });
    return;
  }
  if (type === "entity.parse.failed" || type === "querystring.parse.rangeError") {
    res.status(400).json({ success: false, message: "Format de requête invalide." });
    return;
  }
  res.status(500).json({ success: false, message: "Erreur interne. Veuillez réessayer." });
};
