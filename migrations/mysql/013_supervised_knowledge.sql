-- Additive migration. Existing approved documents and conversations are unchanged.
CREATE TABLE IF NOT EXISTS sabito_knowledge_reviews (
  document_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  category VARCHAR(100) NOT NULL,
  keywords_json TEXT NOT NULL,
  source TEXT NOT NULL,
  reviewed_at DATETIME(6) NULL,
  FOREIGN KEY(document_id) REFERENCES sabito_knowledge_documents(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE,
  KEY review_project(project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sabito_knowledge_answer_links (
  message_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  document_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  FOREIGN KEY(message_id) REFERENCES sabito_messages(id) ON DELETE CASCADE,
  FOREIGN KEY(document_id) REFERENCES sabito_knowledge_documents(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sabito_variant_candidates (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  document_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  formulation VARCHAR(500) NOT NULL,
  formulation_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reason ENUM('selection','positive_feedback') NOT NULL,
  occurrences INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  reviewed_at DATETIME(6) NULL,
  UNIQUE KEY candidate_distinct(project_id,document_id,formulation_hash),
  KEY candidate_review(project_id,status,created_at),
  FOREIGN KEY(document_id) REFERENCES sabito_knowledge_documents(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
