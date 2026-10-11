import type { DatabasePool } from "./mysql-pool";

// Additive, namespaced tables; never DROP/ALTER the customer's existing tables.
const tables = [
  `CREATE TABLE IF NOT EXISTS sabito_projects (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL,
    assistant_name VARCHAR(80) NOT NULL DEFAULT 'Sabito', system_prompt LONGTEXT NOT NULL,
    status ENUM('active','disabled') NOT NULL DEFAULT 'active',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sabito_project_credentials (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    client_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    secret_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    secret_hint VARCHAR(16) NOT NULL, status ENUM('active','revoked') NOT NULL DEFAULT 'active',
    last_used_at DATETIME(6), expires_at DATETIME(6), revoked_at DATETIME(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX credentials_project_status(project_id,status),
    FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sabito_conversations (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    external_user_id VARCHAR(191) COLLATE utf8mb4_bin NOT NULL, metadata JSON,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sabito_messages (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    reply_to_message_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    role ENUM('user','assistant','system','tool') NOT NULL, content LONGTEXT NOT NULL,
    status ENUM('accepted','streaming','completed','failed') NOT NULL,
    idempotency_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin,
    error_code VARCHAR(80), created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    completed_at DATETIME(6),
    UNIQUE KEY message_idempotency(project_id,idempotency_key),
    INDEX messages_conversation_created(conversation_id,created_at),
    FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE,
    FOREIGN KEY(conversation_id) REFERENCES sabito_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY(reply_to_message_id) REFERENCES sabito_messages(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sabito_knowledge_documents (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    title VARCHAR(255) NOT NULL, content LONGTEXT NOT NULL,
    source_type VARCHAR(30) NOT NULL DEFAULT 'manual', status VARCHAR(30) NOT NULL DEFAULT 'ready',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sabito_knowledge_chunks (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    document_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    chunk_index INT NOT NULL, content LONGTEXT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY chunk_position(document_id,chunk_index), FULLTEXT KEY chunks_search(content),
    FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE,
    FOREIGN KEY(document_id) REFERENCES sabito_knowledge_documents(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sabito_audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    actor_type VARCHAR(30) NOT NULL, action VARCHAR(120) NOT NULL, metadata JSON,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

export async function initializeMysqlSchema(pool: DatabasePool) {
  const connection = await pool.connect();
  let locked = false;
  try {
    const result = await connection.query("SELECT GET_LOCK('sabito_schema_setup',30) AS acquired");
    locked = Number(result.rows[0]?.acquired) === 1;
    if (!locked) throw new Error("Could not acquire Sabito schema initialization lock.");
    // MySQL DDL implicitly commits. Each statement is independently retry-safe.
    for (const table of tables) await connection.query(table);
  } finally {
    try { if (locked) await connection.query("SELECT RELEASE_LOCK('sabito_schema_setup')"); }
    finally { connection.release(); }
  }
}
