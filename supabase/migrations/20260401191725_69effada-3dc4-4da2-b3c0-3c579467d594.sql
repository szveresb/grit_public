-- Fix observation_categories: change SELECT policy from public to authenticated
DROP POLICY "Authenticated users can view active categories" ON public.observation_categories;
CREATE POLICY "Authenticated users can view active categories"
ON public.observation_categories
FOR SELECT
TO authenticated
USING (is_active = true);

-- Fix observation_concepts: change SELECT policy from public to authenticated
DROP POLICY "Authenticated users can view active concepts" ON public.observation_concepts;
CREATE POLICY "Authenticated users can view active concepts"
ON public.observation_concepts
FOR SELECT
TO authenticated
USING (is_active = true);