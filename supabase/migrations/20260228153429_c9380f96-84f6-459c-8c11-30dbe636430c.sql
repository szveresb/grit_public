
-- Add journal_entry_id to observation_logs
ALTER TABLE observation_logs
  ADD COLUMN journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL;

-- Seed Tier 1 categories (only if not already present)
INSERT INTO observation_categories (name_en, name_hu, icon, sort_order)
SELECT * FROM (VALUES
  ('Relational Dynamics', 'Kapcsolati dinamika', 'message-circle', 10),
  ('Emotional State', 'Érzelmi állapot', 'heart', 20),
  ('Behavioral Patterns', 'Viselkedési minták', 'shield', 30),
  ('Physical / Somatic', 'Testi jelzések', 'heart', 40)
) AS v(name_en, name_hu, icon, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM observation_categories WHERE observation_categories.name_en = v.name_en
);

-- Seed Tier 2/3 concepts
-- Relational Dynamics concepts
INSERT INTO observation_concepts (category_id, name_en, name_hu, concept_code, bno_code, description_en, description_hu, sort_order)
SELECT c.id, v.name_en, v.name_hu, v.concept_code, v.bno_code, v.description_en, v.description_hu, v.sort_order
FROM (VALUES
  ('Boundary testing', 'Határpróbálgatás', 'boundary-testing', 'F60.3', 'When someone keeps pushing your limits to see how far they can go', 'Amikor valaki folyamatosan feszegeti a határaidat, hogy lássa, meddig mehet el', 1),
  ('Reality distortion', 'Valóságtorzítás', '425038005', 'F60.3', 'When your sense of what really happened gets twisted or denied', 'Amikor a valóságérzékedet megkérdőjelezik vagy eltorzítják', 2),
  ('Conflict escalation', 'Konfliktusfokozás', 'conflict-escalation', 'F60.3', 'When disagreements quickly spiral into intense confrontation', 'Amikor a nézeteltérések gyorsan heves konfrontációvá fajulnak', 3)
) AS v(name_en, name_hu, concept_code, bno_code, description_en, description_hu, sort_order)
CROSS JOIN observation_categories c
WHERE c.name_en = 'Relational Dynamics'
AND NOT EXISTS (
  SELECT 1 FROM observation_concepts WHERE observation_concepts.concept_code = v.concept_code AND observation_concepts.category_id = c.id
);

-- Emotional State concepts
INSERT INTO observation_concepts (category_id, name_en, name_hu, concept_code, bno_code, description_en, description_hu, sort_order)
SELECT c.id, v.name_en, v.name_hu, v.concept_code, v.bno_code, v.description_en, v.description_hu, v.sort_order
FROM (VALUES
  ('Emotional dysregulation', 'Érzelmi szabályozási nehézség', '28639000', 'F32.9', 'When emotions feel overwhelming and hard to manage', 'Amikor az érzelmek elsöprőek és nehezen kezelhetőek', 1),
  ('Emptiness', 'Ürességérzet', 'emptiness', 'F60.3', 'A persistent feeling of inner void or numbness', 'Tartós belső üresség vagy zsibbadtság érzése', 2),
  ('Intense anger', 'Intenzív düh', 'intense-anger', 'F60.3', 'Sudden surges of anger that feel disproportionate', 'Hirtelen dühkitörések, amelyek aránytalannak tűnnek', 3)
) AS v(name_en, name_hu, concept_code, bno_code, description_en, description_hu, sort_order)
CROSS JOIN observation_categories c
WHERE c.name_en = 'Emotional State'
AND NOT EXISTS (
  SELECT 1 FROM observation_concepts WHERE observation_concepts.concept_code = v.concept_code AND observation_concepts.category_id = c.id
);

-- Behavioral Patterns concepts
INSERT INTO observation_concepts (category_id, name_en, name_hu, concept_code, bno_code, description_en, description_hu, sort_order)
SELECT c.id, v.name_en, v.name_hu, v.concept_code, v.bno_code, v.description_en, v.description_hu, v.sort_order
FROM (VALUES
  ('Impulsivity', 'Impulzivitás', '55929007', 'F60.30', 'Acting on impulse without thinking through consequences', 'Átgondolás nélküli cselekvés az impulzusok hatására', 1),
  ('Self-harm ideation', 'Önsértő gondolatok', 'self-harm-ideation', 'F60.3', 'Recurring thoughts of hurting yourself', 'Visszatérő gondolatok az önbántalmazásról', 2),
  ('Abandonment avoidance', 'Elhagyástól való félelem', '225444004', 'F60.3', 'Going to great lengths to prevent real or imagined separation', 'Minden megteszel, hogy elkerüld a valós vagy vélt elhagyást', 3)
) AS v(name_en, name_hu, concept_code, bno_code, description_en, description_hu, sort_order)
CROSS JOIN observation_categories c
WHERE c.name_en = 'Behavioral Patterns'
AND NOT EXISTS (
  SELECT 1 FROM observation_concepts WHERE observation_concepts.concept_code = v.concept_code AND observation_concepts.category_id = c.id
);
