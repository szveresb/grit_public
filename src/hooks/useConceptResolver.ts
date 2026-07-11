import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ConceptResolver, fetchConceptResolver } from "@/lib/observationResolver";

let cachedResolver: ConceptResolver | null = null;
let pendingPromise: Promise<ConceptResolver> | null = null;

export function useConceptResolver() {
  const [resolver, setResolver] = useState<ConceptResolver | null>(cachedResolver);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedResolver);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cachedResolver) {
      setResolver(cachedResolver);
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        if (!pendingPromise) {
          pendingPromise = fetchConceptResolver(supabase);
        }
        const res = await pendingPromise;
        cachedResolver = res;
        setResolver(res);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  return { resolver, isLoading, error };
}
