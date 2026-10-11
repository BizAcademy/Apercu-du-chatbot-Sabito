import type { DatabasePool } from "./mysql-pool";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");
export const databaseDialect = /^mysql:\/\//i.test(connectionString) ? "mysql" : "postgres";
if (!/^(mysql|postgres|postgresql):\/\//i.test(connectionString)) {
  throw new Error("DATABASE_URL must use mysql://, postgres:// or postgresql://.");
}
export const pool: DatabasePool = databaseDialect === "mysql"
  ? (await import("./mysql-pool")).createMysqlPool(connectionString)
  : (await import("@workspace/db")).pool;

// Non-destructive PostgreSQL adaptation of the original MySQL migration.
// A separate schema preserves the existing evaluation corrections.
export async function initializeSabitoCore() {
  if (databaseDialect === "mysql") {
    await (await import("./mysql-schema")).initializeMysqlSchema(pool);
    return;
  }
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query("SELECT pg_advisory_xact_lock(182390431)");
    await connection.query(`
      CREATE SCHEMA IF NOT EXISTS sabito_core;
      CREATE TABLE IF NOT EXISTS sabito_core.projects (
        id uuid PRIMARY KEY, slug varchar(80) NOT NULL UNIQUE,
        name varchar(150) NOT NULL, assistant_name varchar(80) NOT NULL DEFAULT 'Sabito',
        system_prompt text NOT NULL, status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS sabito_core.project_credentials (
        id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES sabito_core.projects(id) ON DELETE CASCADE,
        client_id varchar(80) NOT NULL UNIQUE, secret_hash char(64) NOT NULL, secret_hint varchar(16) NOT NULL,
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
        last_used_at timestamptz, expires_at timestamptz, revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS credentials_project_status ON sabito_core.project_credentials(project_id,status);
      CREATE TABLE IF NOT EXISTS sabito_core.conversations (
        id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES sabito_core.projects(id) ON DELETE CASCADE,
        external_user_id varchar(191) NOT NULL, metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS sabito_core.messages (
        id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES sabito_core.projects(id) ON DELETE CASCADE,
        conversation_id uuid NOT NULL REFERENCES sabito_core.conversations(id) ON DELETE CASCADE,
        reply_to_message_id uuid REFERENCES sabito_core.messages(id) ON DELETE SET NULL,
        role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
        content text NOT NULL, status text NOT NULL CHECK (status IN ('accepted','streaming','completed','failed')),
        idempotency_key varchar(100), error_code varchar(80),
        created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
        UNIQUE(project_id,idempotency_key)
      );
      CREATE INDEX IF NOT EXISTS messages_conversation_created ON sabito_core.messages(conversation_id,created_at);
      CREATE TABLE IF NOT EXISTS sabito_core.knowledge_documents (
        id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES sabito_core.projects(id) ON DELETE CASCADE,
        title varchar(255) NOT NULL, content text NOT NULL, source_type text NOT NULL DEFAULT 'manual',
        status text NOT NULL DEFAULT 'ready', created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS sabito_core.knowledge_chunks (
        id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES sabito_core.projects(id) ON DELETE CASCADE,
        document_id uuid NOT NULL REFERENCES sabito_core.knowledge_documents(id) ON DELETE CASCADE,
        chunk_index integer NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(document_id,chunk_index)
      );
      CREATE INDEX IF NOT EXISTS chunks_search ON sabito_core.knowledge_chunks
        USING gin(to_tsvector('simple',content));
      CREATE TABLE IF NOT EXISTS sabito_core.audit_logs (
        id bigserial PRIMARY KEY, project_id uuid REFERENCES sabito_core.projects(id) ON DELETE SET NULL,
        actor_type text NOT NULL, action varchar(120) NOT NULL, metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally { connection.release(); }
}
