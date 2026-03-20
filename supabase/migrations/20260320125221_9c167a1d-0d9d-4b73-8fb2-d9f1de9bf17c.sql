CREATE OR REPLACE FUNCTION public.validate_observation_intensity()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.intensity < 1 OR NEW.intensity > 5 THEN
    RAISE EXCEPTION 'Intensity must be between 1 and 5';
  END IF;
  IF NEW.subject_type = 'relative' AND NEW.subject_id IS NULL THEN
    RAISE EXCEPTION 'A valid subject must be selected for observer-mode logs';
  END IF;
  RETURN NEW;
END;
$function$;