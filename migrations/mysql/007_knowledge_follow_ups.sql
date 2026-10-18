CREATE TABLE IF NOT EXISTS sabito_knowledge_follow_ups (
  document_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  questions_json LONGTEXT NOT NULL,
  FOREIGN KEY(document_id) REFERENCES sabito_knowledge_documents(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
