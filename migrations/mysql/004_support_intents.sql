CREATE TABLE IF NOT EXISTS sabito_intent_sessions (
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  intent VARCHAR(64) NOT NULL,
  original_question TEXT NOT NULL,
  collected_json TEXT NOT NULL,
  status ENUM('collecting','checking','complete') NOT NULL DEFAULT 'collecting',
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY(conversation_id) REFERENCES sabito_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sabito_support_tickets (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  external_user_id VARCHAR(191) NULL,
  intent VARCHAR(64) NOT NULL,
  reason VARCHAR(64) NOT NULL,
  status ENUM('ouvert','ferme') NOT NULL DEFAULT 'ouvert',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY ticket_par_intention(conversation_id,intent),
  KEY tickets_project(project_id,status,created_at),
  FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(conversation_id) REFERENCES sabito_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
