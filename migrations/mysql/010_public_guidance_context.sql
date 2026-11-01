-- Additive, tenant-owned context for public how-to conversations.
-- Separate from financial verification sessions; no existing rows are changed.
CREATE TABLE IF NOT EXISTS sabito_public_guidance_context (
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  context_json LONGTEXT NOT NULL,
  answer_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (conversation_id) REFERENCES sabito_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
