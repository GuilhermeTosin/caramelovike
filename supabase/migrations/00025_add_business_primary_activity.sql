-- The primary activity is optional so existing businesses retain their current data unchanged.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS primary_activity TEXT,
  ADD COLUMN IF NOT EXISTS primary_activity_custom TEXT;
