import { createHash, randomUUID } from "node:crypto";
import { pool } from "./database";
import { saveKnowledge } from "./knowledge";
import { getProject } from "./projects";
import { isBuzzBooster } from "./buzzbooster-settings";
import { safeVariant } from "./variant-privacy";

export function normalizeQuestion(question: string) {
  return question.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export async function recordUnanswered(projectId: string, question: string, userId?: string,
  executor:Pick<typeof pool,"query">=pool) {
  const hash = createHash("sha256").update(normalizeQuestion(question)).digest("hex");
  await executor.query(`INSERT INTO questions_sans_reponse
    (id,plateforme,question,question_hash,utilisateur_id) VALUES ($1,$2,$3,$4,$5)
    ON DUPLICATE KEY UPDATE nombre_de_fois_posee=nombre_de_fois_posee+1,
    derniere_date=CURRENT_TIMESTAMP(6),statut='a_traiter',
    utilisateur_id=COALESCE(utilisateur_id,VALUES(utilisateur_id))`,
    [randomUUID(), projectId, question, hash, userId ?? null]);
}

export async function answerUnanswered(projectId: string, id: string, content: string) {
  const project=await getProject(projectId);
  const buzz=project&&isBuzzBooster(project.slug,project.name);
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    const { rows } = await connection.query(
      "SELECT question,statut FROM questions_sans_reponse WHERE id=$1 AND plateforme=$2 FOR UPDATE", [id, projectId]);
    if (!rows.length || rows[0].statut === "traite") {
      await connection.query("ROLLBACK");
      return null;
    }
    const question=buzz?(safeVariant(String(rows[0].question))??"Question à reformuler sans données privées"):String(rows[0].question);
    const document = await saveKnowledge(projectId, question, content, undefined, connection,
      [question],undefined,
      buzz?{category:"Questions sans réponse",keywords:[],source:"Réponse rédigée par l’administrateur ; source à documenter."}:undefined);
    await connection.query(
      "UPDATE questions_sans_reponse SET statut='traite',document_id=$1 WHERE id=$2 AND plateforme=$3",
      [document!.documentId, id, projectId]);
    await connection.query("COMMIT");
    const {invalidateAssistant}=await import("./assistant-settings");
    invalidateAssistant(projectId);
    return document;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally { connection.release(); }
}
