-- Additive support memory and anonymous, HttpOnly widget resumption.
-- No existing messages, financial records or references are modified.
CREATE TABLE IF NOT EXISTS sabito_conversation_feedback (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  question_message_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  answer_message_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  question_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  eligible BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('pending','asked','satisfied','unsatisfied','declined') NOT NULL DEFAULT 'pending',
  help_pending BOOLEAN NOT NULL DEFAULT FALSE,
  asked_after_message_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  asked_at DATETIME(6) NULL,
  answered_at DATETIME(6) NULL,
  UNIQUE KEY feedback_question(question_message_id),
  KEY feedback_project(project_id,created_at,question_hash),
  KEY feedback_conversation(conversation_id,status,eligible),
  FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(conversation_id) REFERENCES sabito_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY(question_message_id) REFERENCES sabito_messages(id) ON DELETE CASCADE,
  FOREIGN KEY(answer_message_id) REFERENCES sabito_messages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sabito_widget_guest_sessions (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  client_id VARCHAR(100) NOT NULL,
  origin VARCHAR(2048) NOT NULL,
  external_user_id VARCHAR(191) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  KEY guest_expiry(project_id,expires_at),
  FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
