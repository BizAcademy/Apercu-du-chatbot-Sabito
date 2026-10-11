// Credential and JWT protocol ported from BizConnectAcademy/sabito.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

const required = { ADMIN_API_KEY: 24, JWT_SECRET: 32, CLIENT_SECRET_PEPPER: 32 };
export function configurationStatus() {
  const missingSecrets = Object.entries(required)
    .filter(([name, minimum]) => (process.env[name]?.length ?? 0) < minimum)
    .map(([name]) => name);
  return { configured: missingSecrets.length === 0, missingSecrets, engine: "local-knowledge" };
}
function secret(name: keyof typeof required) {
  const value = process.env[name];
  if (!value || value.length < required[name]) throw new Error("SABITO_NOT_CONFIGURED");
  return value;
}
export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function hashClientSecret(value: string) {
  return createHmac("sha256", secret("CLIENT_SECRET_PEPPER")).update(value, "utf8").digest("hex");
}
export function issueCredentials() {
  const clientId = `sab_${randomBytes(12).toString("hex")}`;
  const clientSecret = `sbs_${randomBytes(32).toString("base64url")}`;
  return { clientId, clientSecret, secretHash: hashClientSecret(clientSecret), secretHint: clientSecret.slice(-8) };
}
export function validAdminKey(value: string) {
  return safeEqual(value, secret("ADMIN_API_KEY"));
}
export type AccessClaims = { sub: string; clientId: string; externalUserId: string; scope: string[] };
export const tokenTtl = 900;
const issuer = () => process.env.JWT_ISSUER || "sabito-bca";
const audience = () => process.env.JWT_AUDIENCE || "sabito-platforms";
export function signAccessToken(claims: AccessClaims) {
  return jwt.sign(claims, secret("JWT_SECRET"), { algorithm: "HS256", issuer: issuer(), audience: audience(), expiresIn: tokenTtl });
}
export function verifyAccessToken(token: string): AccessClaims {
  const claims = jwt.verify(token, secret("JWT_SECRET"), { algorithms: ["HS256"], issuer: issuer(), audience: audience() });
  if (typeof claims === "string" || typeof claims.sub !== "string" ||
      typeof claims.clientId !== "string" || typeof claims.externalUserId !== "string" ||
      !Array.isArray(claims.scope) || !claims.scope.includes("chat:connect")) throw new Error("UNAUTHORIZED");
  return claims as AccessClaims;
}
export function parseBasicCredentials(header?: string) {
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 1 || separator === decoded.length - 1) return null;
  return { clientId: decoded.slice(0, separator), clientSecret: decoded.slice(separator + 1) };
}
