-- Widen the configured main question without changing or deleting existing values.
-- Explicit ALTER approval remains required by the migration runner.
ALTER TABLE sabito_knowledge_documents MODIFY COLUMN title LONGTEXT NOT NULL;
