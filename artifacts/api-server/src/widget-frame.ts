import { pool } from "./sabito/database";
import { validWidgetOrigin } from "./sabito/widget";

// These selectors identify the embed's project, not the member's identity.
// Member identity is still established by the server-issued session token.
export async function widgetFrameOrigins(query: Record<string, unknown>): Promise<string[]> {
  const hasId = query.projectId !== undefined;
  const hasProduct = query.product !== undefined;
  if (hasId || hasProduct) {
    if (hasId && (typeof query.projectId !== "string" || !/^[a-f0-9-]{36}$/i.test(query.projectId))) return [];
    if (hasProduct && (typeof query.product !== "string" || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(query.product))) return [];
    const {rows} = await pool.query(`SELECT p.id,p.slug,w.origins_json FROM sabito_core.projects p
      JOIN sabito_core.widget_settings w ON w.project_id=p.id
      WHERE p.status='active' AND ${hasId ? "p.id=$1" : "p.slug=$1"}`,
      [hasId ? query.projectId : query.product]);
    const project=rows[0];
    // Never fall back to server-wide origins for an unknown, disabled or
    // inconsistent project selector (including projectId/product mismatches).
    if (!project || (hasProduct && project.slug!==query.product)) return [];
    const origins:unknown=JSON.parse(String(project.origins_json));
    return Array.isArray(origins) ? origins.filter((v):v is string=>typeof v==="string"&&validWidgetOrigin(v)) : [];
  }
  // Compatibility for older unscoped embeds explicitly configured by operators.
  return [process.env.PUBLIC_URL,...(process.env.CORS_ORIGINS||"").split(",")]
    .filter((v):v is string=>typeof v==="string").map(v=>v.trim()).filter(validWidgetOrigin);
}
