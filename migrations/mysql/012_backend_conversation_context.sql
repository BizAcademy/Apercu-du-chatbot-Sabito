-- Extend the existing verification session; no second conversation engine.
-- Additive column only: no financial records, messages or references are changed.
-- The migration runner conservatively requires explicit ALTER review.
ALTER TABLE sabito_intent_sessions ADD COLUMN backend_context_json LONGTEXT NULL;
