-- Tracks meaningful public profile edits without treating reviews, moderation,
-- ownership transfers or other administrative changes as content updates.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.businesses
SET updated_at = created_at
WHERE updated_at IS NULL;

ALTER TABLE public.businesses
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_business_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    to_jsonb(NEW) - ARRAY[
      'updated_at',
      'created_at',
      'owner_id',
      'reviews',
      'average_rating',
      'owner_verified',
      'owner_verified_until',
      'moderation_status',
      'moderation_reviewed_at',
      'moderation_reviewed_by'
    ]::TEXT[]
  ) IS DISTINCT FROM (
    to_jsonb(OLD) - ARRAY[
      'updated_at',
      'created_at',
      'owner_id',
      'reviews',
      'average_rating',
      'owner_verified',
      'owner_verified_until',
      'moderation_status',
      'moderation_reviewed_at',
      'moderation_reviewed_by'
    ]::TEXT[]
  ) THEN
    NEW.updated_at = NOW();
  ELSE
    NEW.updated_at = OLD.updated_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_business_profile_updated_at ON public.businesses;
CREATE TRIGGER touch_business_profile_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_business_profile_updated_at();