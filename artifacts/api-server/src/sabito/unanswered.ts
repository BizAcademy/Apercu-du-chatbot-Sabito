import { createHash, randomUUID } from "node:crypto";
import { pool } from "./database";
import { saveKnowledge } from "./knowledge";

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
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    const { rows } = await connection.query(
      "SELECT question,statut FROM questions_sans_reponse WHERE id=$1 AND plateforme=$2 FOR UPDATE", [id, projectId]);
    if (!rows.length || rows[0].statut === "traite") {
      await connection.query("ROLLBACK");
      return null;
    }
    const document = await saveKnowledge(projectId, String(rows[0].question).slice(0, 200), content, undefined, connection,
      [String(rows[0].question).slice(0,500)]);
    await connection.query(
      "UPDATE questions_sans_reponse SET statut='traite',document_id=$1 WHERE id=$2 AND plateforme=$3",
      [document!.documentId, id, projectId]);
    await connection.query("COMMIT");
    return document;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally { connection.release(); }
}
