-- Fix mutable search_path on validation trigger functions
CREATE OR REPLACE FUNCTION public.validate_mood_pulse_level()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if NEW.level < 1 or NEW.level > 5 then
    raise exception 'Level must be between 1 and 5';
  end if;
  return NEW;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;