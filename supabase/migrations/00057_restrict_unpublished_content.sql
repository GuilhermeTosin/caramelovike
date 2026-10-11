-- Cap public reads of businesses and events, even when an older permissive
-- SELECT policy remains installed outside the versioned migrations.

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view businesses" ON public.businesses;
DROP POLICY IF EXISTS businesses_public_read_approved ON public.businesses;
DROP POLICY IF EXISTS businesses_authenticated_read_visible ON public.businesses;
DROP POLICY IF EXISTS businesses_public_read_ceiling ON public.businesses;
DROP POLICY IF EXISTS businesses_authenticated_read_ceiling ON public.businesses;

CREATE POLICY businesses_public_read_approved
  ON public.businesses
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (COALESCE(moderation_status, 'approved') = 'approved');

CREATE POLICY businesses_authenticated_read_visible
  ON public.businesses
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(moderation_status, 'approved') = 'approved'
    OR owner_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.business_managers AS manager
      WHERE manager.business_id = businesses.id
        AND manager.user_id = auth.uid()
        AND public.is_editor(auth.uid())
    )
  );

-- Restrictive policies also cap any permissive policies configured manually
-- on production, where the complete schema is not represented in migrations.
CREATE POLICY businesses_public_read_ceiling
  ON public.businesses
  AS RESTRICTIVE
  FOR SELECT
  TO anon
  USING (COALESCE(moderation_status, 'approved') = 'approved');

CREATE POLICY businesses_authenticated_read_ceiling
  ON public.businesses
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(moderation_status, 'approved') = 'approved'
    OR owner_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.business_managers AS manager
      WHERE manager.business_id = businesses.id
        AND manager.user_id = auth.uid()
        AND public.is_editor(auth.uid())
    )
  );

GRANT SELECT ON public.businesses TO anon, authenticated;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_public_read_published ON public.events;
DROP POLICY IF EXISTS events_authenticated_read_visible ON public.events;
DROP POLICY IF EXISTS events_public_read_ceiling ON public.events;
DROP POLICY IF EXISTS events_authenticated_read_ceiling ON public.events;
DROP POLICY IF EXISTS events_owner_insert ON public.events;
DROP POLICY IF EXISTS events_owner_update ON public.events;
DROP POLICY IF EXISTS events_owner_delete ON public.events;

CREATE POLICY events_public_read_published
  ON public.events
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (
    status = 'published'
    AND (
      business_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.businesses AS business
        WHERE business.id = events.business_id
          AND COALESCE(business.moderation_status, 'approved') = 'approved'
      )
    )
  );

CREATE POLICY events_authenticated_read_visible
  ON public.events
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    (
      status = 'published'
      AND (
        business_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.businesses AS business
          WHERE business.id = events.business_id
            AND COALESCE(business.moderation_status, 'approved') = 'approved'
        )
      )
    )
    OR owner_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.businesses AS business
      WHERE business.id = events.business_id
        AND business.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_managers AS manager
      WHERE manager.business_id = events.business_id
        AND manager.user_id = auth.uid()
        AND public.is_editor(auth.uid())
    )
  );

CREATE POLICY events_public_read_ceiling
  ON public.events
  AS RESTRICTIVE
  FOR SELECT
  TO anon
  USING (
    status = 'published'
    AND (
      business_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.businesses AS business
        WHERE business.id = events.business_id
          AND COALESCE(business.moderation_status, 'approved') = 'approved'
      )
    )
  );

CREATE POLICY events_authenticated_read_ceiling
  ON public.events
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    (
      status = 'published'
      AND (
        business_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.businesses AS business
          WHERE business.id = events.business_id
            AND COALESCE(business.moderation_status, 'approved') = 'approved'
        )
      )
    )
    OR owner_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.businesses AS business
      WHERE business.id = events.business_id
        AND business.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_managers AS manager
      WHERE manager.business_id = events.business_id
        AND manager.user_id = auth.uid()
        AND public.is_editor(auth.uid())
    )
  );

-- Preserve existing owner/editor event management if RLS was not enabled by
-- the production-only schema. Service-role backend operations bypass RLS.
CREATE POLICY events_owner_insert
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      business_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.businesses AS business
        WHERE business.id = events.business_id
          AND (
            business.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1
              FROM public.business_managers AS manager
              WHERE manager.business_id = business.id
                AND manager.user_id = auth.uid()
                AND public.is_editor(auth.uid())
            )
          )
      )
    )
  );

CREATE POLICY events_owner_update
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.businesses AS business
      WHERE business.id = events.business_id
        AND (
          business.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.business_managers AS manager
            WHERE manager.business_id = business.id
              AND manager.user_id = auth.uid()
              AND public.is_editor(auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.businesses AS business
      WHERE business.id = events.business_id
        AND (
          business.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.business_managers AS manager
            WHERE manager.business_id = business.id
              AND manager.user_id = auth.uid()
              AND public.is_editor(auth.uid())
          )
        )
    )
  );

CREATE POLICY events_owner_delete
  ON public.events
  FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.businesses AS business
      WHERE business.id = events.business_id
        AND (
          business.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.business_managers AS manager
            WHERE manager.business_id = business.id
              AND manager.user_id = auth.uid()
              AND public.is_editor(auth.uid())
          )
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
