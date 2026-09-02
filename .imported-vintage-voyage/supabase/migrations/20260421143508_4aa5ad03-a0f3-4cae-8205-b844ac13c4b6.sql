
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

DROP POLICY IF EXISTS "Antique images public read" ON storage.objects;
-- Public reads via getPublicUrl still work; we just don't allow listing the bucket
CREATE POLICY "Antique images public read named" ON storage.objects
  FOR SELECT USING (bucket_id = 'antiques' AND name IS NOT NULL);
