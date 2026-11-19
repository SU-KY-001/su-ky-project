-- Preserve independent podcast sources and their pinned revisions before removing
-- event citation ownership. No source, document or source revision is deleted.
UPDATE series_sources ss
SET historical_citation_id = NULL
FROM historical_citations c
JOIN historical_entities e ON e.id = c.entity_id
WHERE ss.historical_citation_id = c.id AND e.entity_type = 'EVENT';

DELETE FROM historical_citations c
USING historical_entities e
WHERE c.entity_id = e.id AND e.entity_type = 'EVENT';

-- Keep historical snapshots usable while removing retired event metadata.
UPDATE historical_entity_revisions r
SET snapshot = r.snapshot - ARRAY[
  'reviewStatus', 'reviewedVersion', 'reviewedById', 'reviewedAt', 'reviewNote',
  'review_status', 'reviewed_version', 'reviewed_by_id', 'reviewed_at', 'review_note',
  'citations', 'sourceCount', 'citationCount', 'displayStatus', 'readiness'
]
FROM historical_entities e
WHERE r.entity_id = e.id AND e.entity_type = 'EVENT';

DROP INDEX IF EXISTS historical_entities_historical_phase_id_review_status_delet_idx;
ALTER TABLE historical_entities
  DROP COLUMN review_status,
  DROP COLUMN reviewed_version,
  DROP COLUMN reviewed_by_id,
  DROP COLUMN reviewed_at,
  DROP COLUMN review_note;
CREATE INDEX historical_entities_historical_phase_id_deleted_at_idx
  ON historical_entities(historical_phase_id, deleted_at);

DROP TYPE "HistoricalReviewStatus";
