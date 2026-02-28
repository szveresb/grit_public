ALTER TABLE observation_concepts ADD COLUMN bno_code text;

COMMENT ON COLUMN observation_concepts.bno_code IS 'BNO-10 (ICD-10-HU) code for Hungarian healthcare interoperability';