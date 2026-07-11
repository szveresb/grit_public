import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

export type ConceptRow = Database["public"]["Tables"]["observation_concepts"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["observation_categories"]["Row"];

export interface ResolvedConcept {
  id: string; // The exact logged concept ID
  concept_code: string;
  name_hu: string; // Original logged concept name (Hungary)
  name_en: string; // Original logged concept name (English)
  description_hu: string | null;
  description_en: string | null;
  valence: string | null;
  status: string;
  is_selectable: boolean;
  source_type: string;
  canonical_concept_id: string | null;
  canonical_key: string | null;
  
  // Resolved canonical properties
  resolvedId: string; // ID of the canonical concept (equals id if it is canonical)
  resolvedCode: string; // Code of the canonical concept
  resolvedNameHu: string;
  resolvedNameEn: string;
  resolvedDescriptionHu: string | null;
  resolvedDescriptionEn: string | null;
  resolvedValence: "positive" | "negative" | null;
  
  // Category properties (always resolved from the canonical concept)
  category: {
    id: string;
    category_key: string;
    name_hu: string;
    name_en: string;
    icon: string | null;
    sort_order: number;
    is_active: boolean;
  };
}

export class ConceptResolver {
  private conceptsMap: Map<string, ConceptRow> = new Map();
  private categoriesMap: Map<string, CategoryRow> = new Map();

  constructor(concepts: ConceptRow[], categories: CategoryRow[]) {
    concepts.forEach(c => this.conceptsMap.set(c.id, c));
    categories.forEach(cat => this.categoriesMap.set(cat.id, cat));
  }

  /**
   * Resolves a concept ID into a complete ResolvedConcept with canonical hierarchy.
   */
  public resolve(conceptId: string): ResolvedConcept | undefined {
    const concept = this.conceptsMap.get(conceptId);
    if (!concept) return undefined;

    // 1. Resolve canonical concept row
    let canonicalConcept = concept;
    if (concept.canonical_concept_id) {
      const found = this.conceptsMap.get(concept.canonical_concept_id);
      if (found) {
        canonicalConcept = found;
      }
    }

    // 2. Resolve category row
    const category = this.categoriesMap.get(canonicalConcept.category_id);
    if (!category) return undefined;

    return {
      id: concept.id,
      concept_code: concept.concept_code,
      name_hu: concept.name_hu,
      name_en: concept.name_en,
      description_hu: concept.description_hu,
      description_en: concept.description_en,
      valence: concept.valence,
      status: concept.status,
      is_selectable: concept.is_selectable,
      source_type: concept.source_type,
      canonical_concept_id: concept.canonical_concept_id,
      canonical_key: concept.canonical_key,

      resolvedId: canonicalConcept.id,
      resolvedCode: canonicalConcept.concept_code,
      resolvedNameHu: canonicalConcept.name_hu,
      resolvedNameEn: canonicalConcept.name_en,
      resolvedDescriptionHu: canonicalConcept.description_hu,
      resolvedDescriptionEn: canonicalConcept.description_en,
      resolvedValence: canonicalConcept.valence as "positive" | "negative" | null,

      category: {
        id: category.id,
        category_key: category.category_key,
        name_hu: category.name_hu,
        name_en: category.name_en,
        icon: category.icon,
        sort_order: category.sort_order,
        is_active: category.is_active
      }
    };
  }

  /**
   * Returns all active and selectable concepts mapped to their resolved states.
   */
  public getAllSelectableConcepts(): ResolvedConcept[] {
    return Array.from(this.conceptsMap.keys())
      .map(id => this.resolve(id))
      .filter((rc): rc is ResolvedConcept => !!rc && rc.is_selectable && rc.status === 'active');
  }

  /**
   * Helper to return all concepts (useful for analytics mapping).
   */
  public getAllConcepts(): ResolvedConcept[] {
    return Array.from(this.conceptsMap.keys())
      .map(id => this.resolve(id))
      .filter((rc): rc is ResolvedConcept => !!rc);
  }

  /**
   * Returns all active categories sorted by sort_order.
   */
  public getActiveCategories(): CategoryRow[] {
    return Array.from(this.categoriesMap.values())
      .filter(cat => cat.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  /**
   * Returns selectable concepts filtered by category and valence.
   */
  public getConceptsByCategoryAndValence(categoryId: string, valence: "positive" | "negative"): ResolvedConcept[] {
    return this.getAllSelectableConcepts().filter(
      rc => rc.category.id === categoryId && rc.resolvedValence === valence
    );
  }
}

/**
 * Fetches concepts and categories from Supabase and instantiates the ConceptResolver.
 */
export async function fetchConceptResolver(supabase: SupabaseClient<Database>): Promise<ConceptResolver> {
  const [conceptsRes, categoriesRes] = await Promise.all([
    supabase.from('observation_concepts').select('*'),
    supabase.from('observation_categories').select('*')
  ]);

  if (conceptsRes.error) throw conceptsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;

  return new ConceptResolver(
    conceptsRes.data as ConceptRow[],
    categoriesRes.data as CategoryRow[]
  );
}
