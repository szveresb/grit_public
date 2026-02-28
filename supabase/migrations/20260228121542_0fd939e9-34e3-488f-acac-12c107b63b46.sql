-- Phase 2: Add status column to observation_logs
ALTER TABLE observation_logs
  ADD COLUMN status text NOT NULL DEFAULT 'final';

-- Phase 3a: Create analyst_observation_aggregates function
CREATE OR REPLACE FUNCTION analyst_observation_aggregates()
RETURNS TABLE(
  concept_code text,
  concept_name_en text,
  log_count bigint,
  avg_intensity numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT
    oc.concept_code,
    oc.name_en AS concept_name_en,
    COUNT(*)::bigint AS log_count,
    ROUND(AVG(ol.intensity)::numeric, 2) AS avg_intensity
  FROM observation_logs ol
  JOIN observation_concepts oc ON oc.id = ol.concept_id
  GROUP BY oc.concept_code, oc.name_en
  ORDER BY log_count DESC;
$$;