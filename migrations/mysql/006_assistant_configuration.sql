CREATE TABLE IF NOT EXISTS sabito_assistant_settings (
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  config_json LONGTEXT NOT NULL,
  revision BIGINT NOT NULL DEFAULT 0,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  FOREIGN KEY (project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sabito_message_presentations (
  message_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  suggestions_json TEXT NOT NULL,
  suggestions_label TEXT NOT NULL,
  closing_message TEXT NOT NULL,
  FOREIGN KEY (message_id) REFERENCES sabito_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sabito_conversation_welcomes (
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  content TEXT NOT NULL,
  trusted_name VARCHAR(100) NULL,
  FOREIGN KEY (conversation_id) REFERENCES sabito_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
