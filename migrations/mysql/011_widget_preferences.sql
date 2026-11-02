CREATE TABLE IF NOT EXISTS sabito_widget_preferences (
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  draggable TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
