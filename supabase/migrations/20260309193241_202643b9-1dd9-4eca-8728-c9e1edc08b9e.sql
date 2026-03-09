ALTER TABLE public.questionnaires 
ADD COLUMN repeat_interval text DEFAULT null;

COMMENT ON COLUMN public.questionnaires.repeat_interval IS 'null = one-time, daily/weekly/biweekly/monthly/anytime = repeatable intervals';