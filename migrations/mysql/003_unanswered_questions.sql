CREATE TABLE IF NOT EXISTS questions_sans_reponse (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  plateforme CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  question TEXT NOT NULL,
  question_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  utilisateur_id VARCHAR(191) NULL,
  statut ENUM('a_traiter','traite') NOT NULL DEFAULT 'a_traiter',
  nombre_de_fois_posee BIGINT UNSIGNED NOT NULL DEFAULT 1,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  derniere_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  document_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  UNIQUE KEY question_par_plateforme(plateforme,question_hash),
  KEY questions_a_traiter(plateforme,statut,nombre_de_fois_posee),
  FOREIGN KEY(plateforme) REFERENCES sabito_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(document_id) REFERENCES sabito_knowledge_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
