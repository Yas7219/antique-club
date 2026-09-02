
-- 1. messages: authenticated only
DROP POLICY IF EXISTS "Messages viewable by all" ON public.messages;
CREATE POLICY "Messages viewable by authenticated"
  ON public.messages FOR SELECT TO authenticated USING (true);

-- 2. video_rooms: authenticated only
DROP POLICY IF EXISTS "Video rooms viewable by all" ON public.video_rooms;
CREATE POLICY "Video rooms viewable by authenticated"
  ON public.video_rooms FOR SELECT TO authenticated USING (true);

-- 3. profiles: hide phone column via column-level privileges
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, display_name, avatar_url, bio, location, level, verified, kyc_status, nationality, created_at, updated_at)
  ON public.profiles TO anon, authenticated;
GRANT UPDATE (display_name, avatar_url, bio, location, phone) ON public.profiles TO authenticated;

-- RPC so owners can fetch their own phone
CREATE OR REPLACE FUNCTION public.get_own_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.get_own_phone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_phone() TO authenticated;

-- 4. Storage antiques: validated reads
DROP POLICY IF EXISTS "Antique images public read named" ON storage.objects;
CREATE POLICY "Antique images validated public read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'antiques' AND (
      EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.status = 'active'
          AND EXISTS (SELECT 1 FROM unnest(p.images) img WHERE img LIKE '%/antiques/' || storage.objects.name)
      )
      OR EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.image_url LIKE '%/antiques/' || storage.objects.name
      )
    )
  );

-- Owners can still read their own uploads (needed for Sell flow before publish)
CREATE POLICY "Antique images owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'antiques' AND owner = auth.uid());

-- 5. Revoke EXECUTE on internal trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kyc_validate_and_sync() FROM PUBLIC, anon, authenticated;
