
-- Update category icon for Physical / Somatic
UPDATE observation_categories SET icon = 'heart-pulse' WHERE name_en = 'Physical / Somatic';

-- Seed concepts for Physical / Somatic (Testi jelzések)
INSERT INTO observation_concepts (category_id, name_en, name_hu, concept_code, bno_code, description_en, description_hu, sort_order)
SELECT c.id, v.name_en, v.name_hu, v.concept_code, v.bno_code, v.description_en, v.description_hu, v.sort_order
FROM (VALUES
  ('Heart racing', 'Szapora pulzus', '424196004', 'R00.0', 'Rapid or pounding heartbeat', 'Gyors vagy dübörgő szívverés', 1),
  ('Stomach knot', 'Gyomorszorulás', '249497008', 'R10.1', 'A feeling of tension or discomfort in the stomach area', 'Feszültség vagy diszkomfort érzése a gyomortájékon', 2),
  ('Muscle tension', 'Izomfeszültség', '298305001', 'M62.8', 'Persistent tightness in muscles, often in neck or shoulders', 'Tartós izomfeszülés, gyakran a nyakban vagy vállban', 3),
  ('Sleep disturbance', 'Alvászavar', '193462001', 'F51.9', 'Difficulty falling or staying asleep', 'Elalvási vagy átalvási nehézség', 4),
  ('Headache', 'Fejfájás', '25064002', 'R51', 'Pain in any region of the head', 'Fájdalom a fej bármely területén', 5)
) AS v(name_en, name_hu, concept_code, bno_code, description_en, description_hu, sort_order)
CROSS JOIN observation_categories c
WHERE c.name_en = 'Physical / Somatic'
AND NOT EXISTS (
  SELECT 1 FROM observation_concepts WHERE observation_concepts.concept_code = v.concept_code AND observation_concepts.category_id = c.id
);
